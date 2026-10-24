import {
  CHECK_IN_MAX_MINUTES,
  EVENT_END_AT,
  MEETING_COMPLETION_XP,
} from "../constants";
import { demoVenue } from "../venue/venue";
import type {
  AcceptedMeeting,
  LocationDatabase,
  LocationEvent,
  LocationRecord,
  RendezvousView,
} from "../types";
import { mutateLocationDatabase } from "./location-store";
import { LocationError } from "./location-error";
import { meetingAdapter } from "../adapters/meeting-adapter";
export type MeetingContext = { viewerUserId: string; meeting: AcceptedMeeting };
const timestamp = () => new Date().toISOString();
export function createLocationRecord(meeting: AcceptedMeeting): LocationRecord {
  return {
    meetingId: meeting.id,
    eventId: meeting.eventId,
    spot: null,
    checkIns: {},
    arrivals: {},
    confirmations: {},
    awards: {},
    completedAt: null,
    events: [],
  };
}
export function appendLocationEvent(
  record: LocationRecord,
  meeting: AcceptedMeeting,
  type: string,
  payload: Record<string, unknown> = {},
): LocationEvent {
  const event = {
    event_id: record.eventId,
    run_id: meeting.runId,
    meeting_id: record.meetingId,
    seq: record.events.length + 1,
    type,
    timestamp: timestamp(),
    payload,
  };
  record.events.push(event);
  return event;
}
export function expireCheckIns(
  record: LocationRecord,
  meeting: AcceptedMeeting,
  now = Date.now(),
) {
  for (const [userId, checkIn] of Object.entries(record.checkIns)) {
    if (checkIn.revokedAt) continue;
    if (
      meeting.status === "completed" ||
      now >= Date.parse(EVENT_END_AT) ||
      now >= Date.parse(checkIn.expiresAt)
    ) {
      checkIn.revokedAt = new Date(now).toISOString();
      appendLocationEvent(
        record,
        meeting,
        now >= Date.parse(checkIn.expiresAt)
          ? "location.checkin_expired"
          : "location.checkin_revoked",
        { user_id: userId },
      );
    }
  }
}
export function projectRendezvous(
  record: LocationRecord,
  context: MeetingContext,
  now = Date.now(),
): RendezvousView {
  const { meeting, viewerUserId } = context;
  const counterpartId = meeting.counterpart.id;
  const visibleCheckIn = (userId: string) => {
    const value = record.checkIns[userId];
    if (
      !value ||
      value.revokedAt ||
      Date.parse(value.expiresAt) <= now ||
      now >= Date.parse(EVENT_END_AT) ||
      meeting.status === "completed"
    )
      return null;
    const { revokedAt: _, ...shared } = value;
    return shared;
  };
  const award = record.awards[viewerUserId];
  return {
    meetingId: meeting.id,
    eventId: meeting.eventId,
    meetingStatus: meeting.status,
    viewerUserId,
    counterpart: {
      ...meeting.counterpart,
      checkIn: visibleCheckIn(counterpartId),
      arrived: !!record.arrivals[counterpartId],
    },
    spot: record.spot,
    self: {
      id: viewerUserId,
      displayName: meeting.viewerDisplayName || "You",
      checkIn: visibleCheckIn(viewerUserId),
      arrived: !!record.arrivals[viewerUserId],
    },
    verification: {
      selfConfirmed: !!record.confirmations[viewerUserId],
      counterpartConfirmed: !!record.confirmations[counterpartId],
      bothConfirmed:
        meeting.participantIds.every((id) => !!record.confirmations[id]) &&
        !!record.completedAt,
      completedAt: record.completedAt,
    },
    rewards: {
      points: award?.points || 0,
      awardedAt: award?.awardedAt || null,
    },
    lastSeq: record.events.length,
    eventEnded: now >= Date.parse(EVENT_END_AT),
    eventEndsAt: EVENT_END_AT,
    serverTime: new Date(now).toISOString(),
    demo: true,
  };
}
function audit(
  db: LocationDatabase,
  record: LocationRecord,
  userId: string,
  action: string,
) {
  db.auditLogs.push({
    timestamp: timestamp(),
    actorId: userId,
    meetingId: record.meetingId,
    action,
  });
  if (db.auditLogs.length > 5000) db.auditLogs = db.auditLogs.slice(-5000);
}
function assertWritable(meeting: AcceptedMeeting) {
  if (meeting.status !== "accepted")
    throw new LocationError(
      "This meeting is already completed. Location sharing is closed.",
      409,
      "meeting_completed",
    );
  if (Date.now() >= Date.parse(EVENT_END_AT))
    throw new LocationError(
      "The conference has ended. Zone sharing is closed.",
      410,
      "event_ended",
    );
}
function landmark(zoneId: string, meetingSpot = false) {
  const zone = demoVenue.zones.find(
    (zone) => zone.id === zoneId && zone.kind !== "corridor",
  );
  if (!zone || (meetingSpot && !zone.isMeetingSpot))
    throw new LocationError(
      "Choose a named meeting zone from this venue.",
      400,
      "invalid_zone",
    );
  return zone;
}
async function withRecord<T>(
  context: MeetingContext,
  action: string,
  fn: (record: LocationRecord, db: LocationDatabase) => T | Promise<T>,
) {
  return mutateLocationDatabase(async (db) => {
    context.meeting = await meetingAdapter.getAcceptedMeeting(
      context.meeting.eventId,
      context.meeting.id,
      context.viewerUserId,
    );
    if (
      ![
        "rendezvous.read",
        "location.stream_read",
        "location.checkin_revoked",
        "meeting.verification_submitted",
      ].includes(action)
    )
      assertWritable(context.meeting);
    const record = (db.meetings[context.meeting.id] ||= createLocationRecord(
      context.meeting,
    ));
    if (
      record.completedAt &&
      ![
        "rendezvous.read",
        "location.stream_read",
        "location.checkin_revoked",
        "meeting.verification_submitted",
      ].includes(action)
    )
      throw new LocationError(
        "This meeting is completed. Sharing is closed.",
        409,
        "meeting_completed",
      );
    expireCheckIns(record, context.meeting);
    const result = await fn(record, db);
    if (action !== "location.stream_read")
      audit(db, record, context.viewerUserId, action);
    return result;
  });
}
export function readRendezvous(context: MeetingContext) {
  return withRecord(context, "rendezvous.read", (record) =>
    projectRendezvous(record, context),
  );
}
export function proposeSpot(
  context: MeetingContext,
  zoneId: string,
  expectedVersion: number,
) {
  assertWritable(context.meeting);
  const zone = landmark(zoneId, true);
  return withRecord(context, "rendezvous.proposed", (record) => {
    if ((record.spot?.proposalVersion || 0) !== expectedVersion)
      throw new LocationError(
        "The meeting spot changed. Review the latest proposal and try again.",
        409,
        "proposal_conflict",
      );
    if (Object.keys(record.confirmations).length)
      throw new LocationError(
        "A meeting confirmation was already submitted. The spot can no longer change.",
        409,
        "verification_started",
      );
    record.spot = {
      zoneId,
      status: "proposed",
      floorId: zone.floorId,
      proposedBy: context.viewerUserId,
      proposalVersion: expectedVersion + 1,
      confirmedAt: null,
    };
    record.arrivals = {};
    appendLocationEvent(record, context.meeting, "rendezvous.proposed", {
      zone_id: zoneId,
      proposed_by: context.viewerUserId,
      proposal_version: expectedVersion + 1,
    });
    return projectRendezvous(record, context);
  });
}
export function respondToSpot(
  context: MeetingContext,
  proposalVersion: number,
  decision: "accept" | "decline",
) {
  assertWritable(context.meeting);
  return withRecord(context, `rendezvous.${decision}`, (record) => {
    if (
      !record.spot ||
      record.spot.proposalVersion !== proposalVersion ||
      record.spot.status !== "proposed"
    )
      throw new LocationError(
        "This proposal is no longer current. Review the latest meeting spot.",
        409,
        "proposal_conflict",
      );
    if (record.spot.proposedBy === context.viewerUserId)
      throw new LocationError(
        "The other attendee needs to respond to your proposal.",
        403,
        "counterpart_required",
      );
    record.spot.status = decision === "accept" ? "confirmed" : "declined";
    record.spot.confirmedAt = decision === "accept" ? timestamp() : null;
    appendLocationEvent(
      record,
      context.meeting,
      decision === "accept" ? "rendezvous.confirmed" : "rendezvous.declined",
      { zone_id: record.spot.zoneId, proposal_version: proposalVersion },
    );
    return projectRendezvous(record, context);
  });
}
export function shareCheckIn(
  context: MeetingContext,
  zoneId: string,
  shareMinutes: number,
) {
  assertWritable(context.meeting);
  landmark(zoneId);
  if (
    !Number.isInteger(shareMinutes) ||
    shareMinutes < 1 ||
    shareMinutes > CHECK_IN_MAX_MINUTES
  )
    throw new LocationError("Zone sharing can last from 1 to 15 minutes.");
  return withRecord(context, "location.checkin_shared", (record) => {
    const now = Date.now();
    const expiresAt = new Date(
      Math.min(now + shareMinutes * 60000, Date.parse(EVENT_END_AT)),
    ).toISOString();
    record.checkIns[context.viewerUserId] = {
      zoneId,
      source: "self_reported",
      createdAt: new Date(now).toISOString(),
      expiresAt,
      revokedAt: null,
    };
    // Shared stream is an invalidation channel; it never replays historical locations.
    appendLocationEvent(record, context.meeting, "location.checkin_shared", {
      user_id: context.viewerUserId,
    });
    return projectRendezvous(record, context);
  });
}
export function revokeCheckIn(context: MeetingContext) {
  return withRecord(context, "location.checkin_revoked", (record) => {
    const value = record.checkIns[context.viewerUserId];
    if (value && !value.revokedAt) {
      value.revokedAt = timestamp();
      appendLocationEvent(record, context.meeting, "location.checkin_revoked", {
        user_id: context.viewerUserId,
      });
    }
    return projectRendezvous(record, context);
  });
}
export function recordArrival(context: MeetingContext, arrived: boolean) {
  assertWritable(context.meeting);
  return withRecord(context, "location.arrived", (record) => {
    if (record.spot?.status !== "confirmed")
      throw new LocationError(
        "Agree on a meeting spot before marking arrival.",
        409,
        "spot_required",
      );
    if (record.confirmations[context.viewerUserId] && !arrived)
      throw new LocationError(
        "Arrival cannot be removed after you confirm meeting.",
        409,
      );
    if (!!record.arrivals[context.viewerUserId] !== arrived) {
      record.arrivals[context.viewerUserId] = arrived ? timestamp() : null;
      appendLocationEvent(record, context.meeting, "location.arrived", {
        user_id: context.viewerUserId,
        arrived,
      });
    }
    return projectRendezvous(record, context);
  });
}
export function verifyMeeting(context: MeetingContext) {
  if (
    Date.now() >= Date.parse(EVENT_END_AT) &&
    context.meeting.status !== "completed"
  )
    throw new LocationError(
      "The conference has ended. This meeting can no longer be verified.",
      410,
      "event_ended",
    );
  return withRecord(
    context,
    "meeting.verification_submitted",
    async (record) => {
      if (
        context.meeting.status === "completed" &&
        !record.completedAt &&
        !context.meeting.verifiedCompletion
      )
        throw new LocationError(
          "This meeting was already completed outside Find Twin. No verification rewards are available.",
          409,
          "already_completed",
        );
      if (record.completedAt)
        return projectRendezvous(record, {
          ...context,
          meeting: { ...context.meeting, status: "completed" },
        });
      if (record.spot?.status !== "confirmed")
        throw new LocationError(
          "Agree on a meeting spot before confirming you met.",
          409,
          "spot_required",
        );
      if (!record.arrivals[context.viewerUserId])
        throw new LocationError(
          "Mark yourself here before confirming you met.",
          409,
          "arrival_required",
        );
      if (!record.confirmations[context.viewerUserId]) {
        record.confirmations[context.viewerUserId] = timestamp();
        appendLocationEvent(
          record,
          context.meeting,
          "meeting.verification_submitted",
          {
            user_id: context.viewerUserId,
            verification_method: "mutual_confirm",
          },
        );
      }
      if (
        context.meeting.participantIds.every((id) => !!record.confirmations[id])
      ) {
        const completedAt = timestamp();
        await meetingAdapter.onMeetingVerified({
          type: "meeting.completed",
          eventId: context.meeting.eventId,
          meetingId: context.meeting.id,
          participantIds: context.meeting.participantIds,
          completedAt,
          verificationMethod: "mutual_confirm",
          consentScope: "meeting_metadata_only",
        });
        record.completedAt = completedAt;
        appendLocationEvent(record, context.meeting, "meeting.completed", {
          consent_scope: "meeting_metadata_only",
          verification_method: "mutual_confirm",
        });
        for (const userId of context.meeting.participantIds) {
          if (!record.awards[userId]) {
            record.awards[userId] = {
              points: MEETING_COMPLETION_XP,
              awardedAt: completedAt,
            };
            appendLocationEvent(
              record,
              context.meeting,
              "rewards.points_awarded",
              { user_id: userId, points: MEETING_COMPLETION_XP },
            );
          }
        }
        const completedMeeting = {
          ...context.meeting,
          status: "completed" as const,
        };
        expireCheckIns(record, completedMeeting);
        return projectRendezvous(record, {
          ...context,
          meeting: completedMeeting,
        });
      }
      return projectRendezvous(record, context);
    },
  );
}
export async function readLocationEvents(
  context: MeetingContext,
  lastSequence: number,
) {
  return withRecord(context, "location.stream_read", (record) => ({
    events: record.events.filter((event) => event.seq > lastSequence),
    closed:
      context.meeting.status === "completed" ||
      Date.now() >= Date.parse(EVENT_END_AT),
  }));
}
