import { captionResponse } from "@/features/fieldnotes/caption-relay";
import { NextRequest } from "next/server";
import {
  viewerFromRequest,
  assertEventMember,
  limitLocationRequests,
} from "@/features/find-twin/server/authorization";
import {
  locationErrorResponse,
  type LocationRouteContext,
} from "@/features/find-twin/server/http";
import { readJournal } from "@/features/fieldnotes/server";
import { LocationError } from "@/features/find-twin/server/location-error";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Keep the device endpoint server-side. Only its configured owner can subscribe. No raw audio is relayed. */
export async function GET(request: NextRequest, route: LocationRouteContext) {
  try {
    const { eventId, meetingId } = await route.params;
    const viewer = viewerFromRequest(request);
    assertEventMember(eventId);
    limitLocationRequests(viewer, meetingId);
    await readJournal(eventId, meetingId, viewer);
    if (
      viewer !== (process.env.OMI_BRIDGE_OWNER_USER_ID || "usr_self") ||
      !process.env.OMI_BRIDGE_URL
    )
      throw new LocationError(
        "Live Omi is not configured for this account.",
        403,
      );
    return captionResponse(request, process.env.OMI_BRIDGE_URL, () =>
      readJournal(eventId, meetingId, viewer),
    );
  } catch (error) {
    return locationErrorResponse(error);
  }
}
