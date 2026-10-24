import { getDatabase, mutateDatabase } from "@/lib/store";
import { attendees, defaultProfile } from "@/lib/fixtures";
import { portraitFor } from "@/lib/portraits";
import type { AcceptedMeeting, MeetingCompletedEvent } from "../types";
import { LocationError } from "../server/location-error";

/** The only Find Twin boundary that writes upstream meeting records. */
export interface MeetingAdapter {
  getAcceptedMeeting(
    eventId: string,
    meetingId: string,
    viewerUserId: string,
  ): Promise<AcceptedMeeting>;
  onMeetingVerified(event: MeetingCompletedEvent): Promise<void>;
}
export const meetingAdapter: MeetingAdapter = {
  async getAcceptedMeeting(eventId, meetingId, viewerUserId) {
    const db = await getDatabase();
    const meeting = db.meetings.find(
      (item) => item.id === meetingId && item.eventId === eventId,
    );
    if (
      !meeting ||
      ![meeting.ownerUserId, meeting.candidateId].includes(viewerUserId)
    )
      throw new LocationError(
        "This meeting is not available to this account.",
        404,
        "meeting_not_found",
      );
    if (
      !["accepted", "completed"].includes(meeting.status) ||
      !meeting.requesterAccepted ||
      !meeting.recipientAccepted
    )
      throw new LocationError(
        "Accept an introduction first. Both people must approve before using Find Twin.",
        403,
        "meeting_not_accepted",
      );
    const counterpartId =
      meeting.ownerUserId === viewerUserId
        ? meeting.candidateId
        : meeting.ownerUserId;
    const profile = db.profiles[counterpartId];
    const fixture = attendees.find((person) => person.id === counterpartId);
    const accepted = db.runs
      .flatMap((run) => run.events)
      .find(
        (event) =>
          event.type === "meeting.accepted" &&
          event.payload.meeting_id === meetingId,
      );
    return {
      viewerDisplayName:
        db.profiles[viewerUserId]?.name ||
        attendees.find((person) => person.id === viewerUserId)?.name ||
        defaultProfile.name,
      verifiedCompletion: db.integrationEvents.some(
        (event) =>
          event.type === "meeting.completed" &&
          (event.meetingId === meeting.id || event.meeting_id === meeting.id) &&
          event.verificationMethod === "mutual_confirm",
      ),
      id: meeting.id,
      eventId: meeting.eventId,
      matchId: meeting.matchId,
      status: meeting.status as AcceptedMeeting["status"],
      participantIds: [meeting.ownerUserId, meeting.candidateId],
      acceptedAt: accepted?.timestamp || meeting.createdAt,
      runId:
        db.matches.find((match) => match.id === meeting.matchId)?.runId || null,
      counterpart: {
        id: counterpartId,
        displayName: profile?.name || fixture?.name || defaultProfile.name,
        role: profile?.role || fixture?.role,
        avatarUrl:
          counterpartId === "usr_self" ? undefined : portraitFor(counterpartId),
      },
    };
  },
  async onMeetingVerified(event) {
    await mutateDatabase((db) => {
      const meeting = db.meetings.find(
        (item) => item.id === event.meetingId && item.eventId === event.eventId,
      );
      if (
        !meeting ||
        !meeting.requesterAccepted ||
        !meeting.recipientAccepted ||
        !["accepted", "completed"].includes(meeting.status)
      )
        throw new LocationError(
          "The introduction is no longer accepted.",
          409,
          "meeting_changed",
        );
      if (
        new Set(event.participantIds).size !== 2 ||
        !event.participantIds.every((id) =>
          [meeting.ownerUserId, meeting.candidateId].includes(id),
        )
      )
        throw new LocationError("Meeting participants changed.", 409);
      meeting.status = "completed";
      const previous = db.integrationEvents.find(
        (item) =>
          item.type === "meeting.completed" &&
          (item.meeting_id === meeting.id || item.meetingId === meeting.id),
      );
      if (!previous)
        db.integrationEvents.push({
          ...event,
          user_id: meeting.ownerUserId,
          event_id: event.eventId,
          meeting_id: meeting.id,
          timestamp: event.completedAt,
          consent_scope: event.consentScope,
        });
      const run = db.runs.find(
        (item) =>
          item.id ===
          db.matches.find((match) => match.id === meeting.matchId)?.runId,
      );
      if (
        run &&
        !run.events.some(
          (item) =>
            item.type === "meeting.completed" &&
            item.payload.meeting_id === meeting.id,
        )
      )
        run.events.push({
          event_id: event.eventId,
          run_id: run.id,
          seq: run.events.length + 1,
          type: "meeting.completed",
          timestamp: event.completedAt,
          payload: {
            meeting_id: meeting.id,
            consent_scope: event.consentScope,
          },
        });
    });
  },
};
