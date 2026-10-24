import type { NextRequest } from "next/server";
import { attendees } from "@/lib/fixtures";
import { LocationError } from "./location-error";
import { mutateLocationDatabase } from "./location-store";
import { meetingAdapter } from "../adapters/meeting-adapter";
const counters = new Map<string, { count: number; start: number }>();
/** Explicit local guest demo uses the same HTTP-only demo cookie as the twin module. */
export function viewerFromRequest(request: NextRequest) {
  const viewer = request.cookies.get("demo_user")?.value || "usr_self";
  if (
    viewer !== "usr_self" &&
    !attendees.some((person) => person.id === viewer)
  )
    throw new LocationError(
      "Choose a valid demo account.",
      401,
      "unauthorized",
    );
  return viewer;
}
export function assertEventMember(eventId: string) {
  if (eventId !== "evt_demo")
    throw new LocationError(
      "This event is not available to this account.",
      404,
      "event_not_found",
    );
}
export function limitLocationRequests(
  userId: string,
  meetingId: string,
  mutation = false,
) {
  const key = `${userId}:${meetingId}:${mutation ? "write" : "read"}`;
  const now = Date.now();
  const item = counters.get(key);
  if (!item || now - item.start > 60000) {
    counters.set(key, { count: 1, start: now });
    return;
  }
  if (++item.count > (mutation ? 60 : 300))
    throw new LocationError(
      "Please wait a moment before trying again.",
      429,
      "rate_limited",
    );
}
export async function authorizeMeeting(
  request: NextRequest,
  eventId: string,
  meetingId: string,
  mutation = false,
) {
  const viewer = viewerFromRequest(request);
  assertEventMember(eventId);
  limitLocationRequests(viewer, meetingId, mutation);
  try {
    return {
      viewerUserId: viewer,
      meeting: await meetingAdapter.getAcceptedMeeting(
        eventId,
        meetingId,
        viewer,
      ),
    };
  } catch (error) {
    if (error instanceof LocationError && error.status === 403)
      await mutateLocationDatabase((db) => {
        const record = db.meetings[meetingId];
        if (record) {
          for (const [userId, checkIn] of Object.entries(record.checkIns)) {
            if (checkIn.revokedAt) continue;
            const revokedAt = new Date().toISOString();
            checkIn.revokedAt = revokedAt;
            record.events.push({
              event_id: record.eventId,
              run_id: record.events[0]?.run_id || null,
              meeting_id: meetingId,
              seq: record.events.length + 1,
              type: "location.checkin_revoked",
              timestamp: revokedAt,
              payload: { user_id: userId },
            });
          }
          db.auditLogs.push({
            timestamp: new Date().toISOString(),
            actorId: viewer,
            meetingId,
            action: "location.revoke_unavailable_meeting",
          });
        }
      });
    throw error;
  }
}
