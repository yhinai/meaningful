import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  viewerFromRequest,
  assertEventMember,
  limitLocationRequests,
} from "@/features/find-twin/server/authorization";
import {
  locationErrorResponse,
  type LocationRouteContext,
} from "@/features/find-twin/server/http";
import { LocationError } from "@/features/find-twin/server/location-error";
import { readJournal } from "@/features/fieldnotes/server";
import {
  createIllustration,
  imageGenerationConfigured,
  saveVisual,
  searchPhotos,
  webVisualSchema,
} from "@/features/fieldnotes/visuals";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;
const headers = { "Cache-Control": "private, no-store", Vary: "Cookie" };
async function authorize(request: NextRequest, route: LocationRouteContext) {
  const { eventId, meetingId } = await route.params;
  const viewer = viewerFromRequest(request);
  assertEventMember(eventId);
  limitLocationRequests(viewer, meetingId, request.method !== "GET");
  const { journal } = await readJournal(eventId, meetingId, viewer);
  if (!journal.edition)
    throw new LocationError("Make an edition before adding pictures.", 409);
  return { eventId, meetingId, viewer, journal };
}
export async function GET(request: NextRequest, route: LocationRouteContext) {
  try {
    await authorize(request, route);
    const query = request.nextUrl.searchParams.get("query");
    return NextResponse.json(
      {
        configured: imageGenerationConfigured(),
        photos: query ? await searchPhotos(query) : [],
      },
      { headers },
    );
  } catch (error) {
    return failure(error);
  }
}
export async function POST(request: NextRequest, route: LocationRouteContext) {
  try {
    const { eventId, meetingId, viewer, journal } = await authorize(
      request,
      route,
    );
    const input = z
      .discriminatedUnion("action", [
        z
          .object({
            action: z.literal("select"),
            revision: z.number().int().min(0),
            visual: webVisualSchema,
          })
          .strict(),
        z
          .object({
            action: z.literal("generate"),
            revision: z.number().int().min(0),
            query: z.string().trim().min(2).max(160),
            consent: z.literal(true),
          })
          .strict(),
      ])
      .parse(await request.json());
    if (journal.revision !== input.revision)
      throw new LocationError(
        "Your edition changed. Reload before adding a picture.",
        409,
      );
    const visual =
      input.action === "generate"
        ? await createIllustration(input.query)
        : input.visual;
    return NextResponse.json(
      await saveVisual(eventId, meetingId, viewer, input.revision, visual),
      { headers },
    );
  } catch (error) {
    return failure(error);
  }
}
function failure(error: unknown) {
  if (
    error instanceof LocationError ||
    error instanceof z.ZodError ||
    error instanceof SyntaxError
  )
    return locationErrorResponse(error);
  return NextResponse.json(
    {
      error:
        "The picture could not be prepared. Your edition is saved; try again or choose another image source.",
    },
    { status: 502, headers },
  );
}
