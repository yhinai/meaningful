export type SharePermissions = {
  bio: boolean;
  expertise: boolean;
  offers: boolean;
  seeks: boolean;
  topics: boolean;
  company: boolean;
};
export type TwinProfile = {
  id: string;
  name: string;
  role: string;
  company: string;
  bio: string;
  expertise: string[];
  offers: string;
  seeks: string;
  conversationStyle: string;
  topicsToAvoid: string;
  permissions: SharePermissions;
  version: number;
};
export type ConferenceGoals = {
  text: string;
  categories: string[];
  industry: string;
  stage: string;
  outcome: string;
};
export type Person = {
  id: string;
  name: string;
  role: string;
  company: string;
  topics: string[];
  bio: string;
  avatar: string;
  color: string;
  score: number;
  expertise: string[];
  offers: string;
  seeks: string;
  conversationStyle: string;
  optIn: boolean;
  eventId: string;
  availability: boolean;
};
export type ScoreBreakdown = {
  goalComplementarity: number;
  expertiseAlignment: number;
  sharedTopics: number;
  mutualInterest: number;
  conversationFit: number;
};
export type RunEvent = {
  event_id: string;
  run_id: string;
  seq: number;
  type: string;
  timestamp: string;
  payload: Record<string, unknown>;
};
export type TwinMessage = {
  id: string;
  candidateId: string;
  speaker: "your_twin" | "candidate_twin";
  text: string;
  sharedFacts: string[];
  questions: string[];
  demo: true;
};
export type CandidateRanking = {
  candidateId: string;
  rank: number;
  score: number;
  reasons: string[];
  evidencePaths: string[];
  breakdown: ScoreBreakdown;
};
export type TwinRun = {
  /** New runs evaluate a fresh batch; absent on historical three-talk demos. */
  batchSize?: number;
  id: string;
  eventId: string;
  ownerUserId: string;
  status: "running" | "completed" | "failed";
  phase: string;
  createdAt: string;
  profileVersion: number;
  profileSnapshot: TwinProfile;
  goalsSnapshot: ConferenceGoals;
  rankings: CandidateRanking[];
  messages: TwinMessage[];
  events: RunEvent[];
  discoveredCount: number;
  conversationCount: number;
  qualifiedCount: number;
  idempotencyKey?: string;
  demo: true;
};
export type Match = {
  id: string;
  runId: string;
  candidateId: string;
  ownerUserId: string;
  score: number;
  breakdown: ScoreBreakdown;
  reasons: string[];
  concerns: string[];
  evidenceRefs: string[];
  scoringVersion: string;
  status: "suggested" | "requested" | "accepted" | "declined";
  demo: true;
};
export type Meeting = {
  id: string;
  matchId: string;
  eventId: string;
  ownerUserId: string;
  candidateId: string;
  requesterAccepted: boolean;
  recipientAccepted: boolean;
  status: "awaiting_approval" | "accepted" | "declined" | "completed";
  createdAt: string;
  feedback?: { relevance: number; note: string };
};
export type ScoutingSummary = {
  conferenceSize: number;
  batchSize: number;
  discoveredTotal: number;
  matchedTotal: number;
  remainingEligible: number;
  remainingAttendees: number;
  exhausted: boolean;
};
export type DemoState = {
  scouting?: ScoutingSummary;
  profile: TwinProfile;
  goals: ConferenceGoals;
  candidates: Person[];
  runs: TwinRun[];
  matches: Match[];
  meetings: Meeting[];
  activeUserId: string;
  demo: true;
  integrationStatus: Record<string, string>;
};
export type Database = {
  fieldnotes?: Record<string, import("@/features/fieldnotes/model").Fieldnotes>;
  profiles: Record<string, TwinProfile>;
  goals: Record<string, ConferenceGoals>;
  runs: TwinRun[];
  matches: Match[];
  meetings: Meeting[];
  integrationEvents: Record<string, unknown>[];
};
