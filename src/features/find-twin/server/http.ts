import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  authorizeMeeting,
  assertEventMember,
  limitLocationRequests,
  viewerFromRequest,
} from "./authorization";
import { LocationError } from "./location-error";
import { demoVenue } from "../venue/venue";
import {
  readRendezvous,
  proposeSpot,
  respondToSpot,
  shareCheckIn,
  revokeCheckIn,
  recordArrival,
  verifyMeeting,
} from "./rendezvous-service";
export type LocationRouteContext = {
  params: Promise<{ eventId: string; meetingId: string }>;
};
export type VenueRouteContext = { params: Promise<{ eventId: string }> };
const zoneSchema = z
  .object({
    zoneId: z.string().min(1).max(100),
    proposalVersion: z.number().int().min(0).default(0),
  })
  .strict();
const responseSchema = z
  .object({
    proposalVersion: z.number().int().min(1),
    decision: z.enum(["accept", "decline"]),
  })
  .strict();
const checkInSchema = z
  .object({
    zoneId: z.string().min(1).max(100),
    shareMinutes: z.number().int().min(1).max(15),
  })
  .strict();
const arrivalSchema = z.object({ arrived: z.boolean() }).strict();
const verificationSchema = z.object({ confirmed: z.literal(true) }).strict();
const noCache = {
  "Cache-Control": "private, no-store, max-age=0",
  Vary: "Cookie",
};
export function locationErrorResponse(error: unknown) {
  if (error instanceof LocationError)
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.status, headers: noCache },
    );
  if (error instanceof z.ZodError || error instanceof SyntaxError)
    return NextResponse.json(
      {
        error: "Please check the request and try again.",
        code: "validation_error",
      },
      { status: 400, headers: noCache },
    );
  console.error(
    "[Find Twin] request failed",
    error instanceof Error ? error.message : "Unknown error",
  );
  return NextResponse.json(
    {
      error: "Your rendezvous could not be updated. Please try again.",
      code: "server_error",
    },
    { status: 500, headers: noCache },
  );
}
export async function venueResponse(
  request: NextRequest,
  route: VenueRouteContext,
) {
  try {
    const { eventId } = await route.params;
    const viewer = viewerFromRequest(request);
    assertEventMember(eventId);
    limitLocationRequests(viewer, eventId);
    return NextResponse.json(demoVenue, { headers: noCache });
  } catch (error) {
    return locationErrorResponse(error);
  }
}
export async function locationResponse(
  request: NextRequest,
  route: LocationRouteContext,
  action:
    "read" | "propose" | "respond" | "share" | "revoke" | "arrive" | "verify",
) {
  try {
    const { eventId, meetingId } = await route.params;
    const context = await authorizeMeeting(
      request,
      eventId,
      meetingId,
      action !== "read",
    );
    let result;
    switch (action) {
      case "read":
        result = await readRendezvous(context);
        break;
      case "propose": {
        const body = zoneSchema.parse(await request.json());
        result = await proposeSpot(context, body.zoneId, body.proposalVersion);
        break;
      }
      case "respond": {
        const body = responseSchema.parse(await request.json());
        result = await respondToSpot(
          context,
          body.proposalVersion,
          body.decision,
        );
        break;
      }
      case "share": {
        const body = checkInSchema.parse(await request.json());
        result = await shareCheckIn(context, body.zoneId, body.shareMinutes);
        break;
      }
      case "revoke":
        result = await revokeCheckIn(context);
        break;
      case "arrive":
        result = await recordArrival(
          context,
          arrivalSchema.parse(await request.json()).arrived,
        );
        break;
      case "verify":
        verificationSchema.parse(await request.json());
        result = await verifyMeeting(context);
        break;
    }
    return NextResponse.json(result, { headers: noCache });
  } catch (error) {
    return locationErrorResponse(error);
  }
}
