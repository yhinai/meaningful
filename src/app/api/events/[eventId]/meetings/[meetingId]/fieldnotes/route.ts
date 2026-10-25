import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { attendees, defaultProfile } from "@/lib/fixtures";
import {
  viewerFromRequest,
  assertEventMember,
  limitLocationRequests,
} from "@/features/find-twin/server/authorization";
import {
  locationErrorResponse,
  type LocationRouteContext,
} from "@/features/find-twin/server/http";
import {
  readJournal,
  saveJournal,
  buildJournal,
} from "@/features/fieldnotes/server";
import { generationConfigured } from "@/features/fieldnotes/generate";
import { LocationError } from "@/features/find-twin/server/location-error";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;
const headers = { "Cache-Control": "private, no-store", Vary: "Cookie" };
async function context(request: NextRequest, route: LocationRouteContext) {
  const { eventId, meetingId } = await route.params;
  const viewer = viewerFromRequest(request);
  assertEventMember(eventId);
  limitLocationRequests(viewer, meetingId, request.method !== "GET");
  return { eventId, meetingId, viewer };
}
export async function GET(request: NextRequest, route: LocationRouteContext) {
  try {
    const { eventId, meetingId, viewer } = await context(request, route);
    const { meeting, journal } = await readJournal(eventId, meetingId, viewer);
    const otherId =
      meeting.ownerUserId === viewer
        ? meeting.candidateId
        : meeting.ownerUserId;
    return NextResponse.json(
      {
        journal,
        viewer,
        meetingStatus: meeting.status,
        counterpart:
          otherId === "usr_self"
            ? defaultProfile.name
            : (attendees.find((p) => p.id === otherId)?.name ??
              "Your connection"),
        generationConfigured: generationConfigured(),
        liveConfigured:
          !!process.env.OMI_BRIDGE_URL &&
          viewer === (process.env.OMI_BRIDGE_OWNER_USER_ID || "usr_self"),
      },
      { headers },
    );
  } catch (error) {
    return locationErrorResponse(error);
  }
}
export async function PUT(request: NextRequest, route: LocationRouteContext) {
  try {
    const { eventId, meetingId, viewer } = await context(request, route);
    const raw = await request.text();
    if (raw.length > 100000)
      return NextResponse.json(
        { error: "Use a transcript shorter than 60,000 characters." },
        { status: 413, headers },
      );
    return NextResponse.json(
      await saveJournal(eventId, meetingId, viewer, JSON.parse(raw)),
      { headers },
    );
  } catch (error) {
    if (
      error instanceof Error &&
      !(error instanceof z.ZodError) &&
      error.name === "Error"
    )
      return NextResponse.json(
        { error: error.message },
        { status: 400, headers },
      );
    return locationErrorResponse(error);
  }
}
export async function POST(request: NextRequest, route: LocationRouteContext) {
  try {
    const { eventId, meetingId, viewer } = await context(request, route);
    const input = z
      .object({ revision: z.number().int().min(0), consent: z.literal(true) })
      .strict()
      .parse(await request.json());
    return NextResponse.json(
      await buildJournal(eventId, meetingId, viewer, input.revision),
      { headers },
    );
  } catch (error) {
    if (
      !(error instanceof LocationError) &&
      !(error instanceof z.ZodError) &&
      !(error instanceof SyntaxError)
    )
      return NextResponse.json(
        {
          error:
            "Your edition could not be prepared. Check the Gemini configuration or try again. Your saved notes and edition are preserved.",
        },
        { status: 502, headers },
      );
    return locationErrorResponse(error);
  }
}
