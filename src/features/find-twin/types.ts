export type AcceptedMeeting = {
  id: string;
  eventId: string;
  matchId: string;
  status: "accepted" | "completed";
  participantIds: [string, string];
  counterpart: {
    id: string;
    displayName: string;
    avatarUrl?: string;
    role?: string;
  };
  acceptedAt: string;
  runId: string | null;
  viewerDisplayName?: string;
  verifiedCompletion?: boolean;
};
export type ZoneCheckIn = {
  zoneId: string;
  source: "self_reported";
  createdAt: string;
  expiresAt: string;
};
export type RendezvousSpot = {
  zoneId: string;
  status: "proposed" | "confirmed" | "declined";
  floorId: string;
  proposedBy: string;
  proposalVersion: number;
  confirmedAt: string | null;
};
export type RendezvousView = {
  meetingId: string;
  eventId: string;
  meetingStatus: "accepted" | "completed";
  viewerUserId: string;
  counterpart: AcceptedMeeting["counterpart"] & {
    checkIn: ZoneCheckIn | null;
    arrived: boolean;
  };
  spot: RendezvousSpot | null;
  self: {
    id: string;
    displayName: string;
    checkIn: ZoneCheckIn | null;
    arrived: boolean;
  };
  verification: {
    selfConfirmed: boolean;
    counterpartConfirmed: boolean;
    bothConfirmed: boolean;
    completedAt: string | null;
  };
  rewards: { points: number; awardedAt: string | null };
  lastSeq: number;
  eventEnded: boolean;
  eventEndsAt: string;
  serverTime: string;
  demo: true;
};
export type MeetingCompletedEvent = {
  type: "meeting.completed";
  eventId: string;
  meetingId: string;
  participantIds: [string, string];
  completedAt: string;
  verificationMethod: "mutual_confirm";
  consentScope: "meeting_metadata_only";
};
export type LocationEvent = {
  event_id: string;
  run_id: string | null;
  meeting_id: string;
  seq: number;
  type: string;
  timestamp: string;
  payload: Record<string, unknown>;
};
export type LocationRecord = {
  meetingId: string;
  eventId: string;
  spot: RendezvousSpot | null;
  checkIns: Record<string, ZoneCheckIn & { revokedAt: string | null }>;
  arrivals: Record<string, string | null>;
  confirmations: Record<string, string>;
  awards: Record<string, { points: number; awardedAt: string }>;
  completedAt: string | null;
  events: LocationEvent[];
};
export type LocationDatabase = {
  version: 1;
  meetings: Record<string, LocationRecord>;
  auditLogs: Array<{
    timestamp: string;
    actorId: string;
    meetingId: string;
    action: string;
  }>;
};
