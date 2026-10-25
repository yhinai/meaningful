import test from "node:test";
import assert from "node:assert/strict";
import { chosenConferencePeople, deriveConferenceCircle } from "../src/components/conference/graph-state";
import { deriveConnections } from "../src/components/connections/model";
import { attendees, defaultGoals, defaultProfile } from "../src/lib/fixtures";
import type { DemoState, Meeting, RunEvent, TwinRun } from "../src/lib/types";

function event(type: string, candidateId: string, seq = 1): RunEvent {
  return {
    event_id: "evt_demo",
    run_id: "run_new",
    seq,
    type,
    timestamp: "2026-10-24T17:00:00Z",
    payload: { candidate_id: candidateId },
  };
}
function meeting(candidateId: string, status: Meeting["status"]): Meeting {
  return {
    id: `meeting_${candidateId}`,
    matchId: `match_old_${candidateId}`,
    eventId: "evt_demo",
    ownerUserId: "usr_self",
    candidateId,
    requesterAccepted: true,
    recipientAccepted: status !== "awaiting_approval",
    status,
    createdAt: "2026-10-24T16:00:00Z",
  };
}
function stateWith(
  events: RunEvent[],
  status: TwinRun["status"] = "completed",
): DemoState {
  return {
    profile: defaultProfile,
    goals: defaultGoals,
    candidates: attendees,
    matches: [],
    meetings: [],
    activeUserId: "usr_self",
    demo: true,
    integrationStatus: {},
    runs: [
      {
        id: "run_new",
        eventId: "evt_demo",
        ownerUserId: "usr_self",
        status,
        phase: "Demo",
        createdAt: "2026-10-24T17:00:00Z",
        profileVersion: 1,
        profileSnapshot: defaultProfile,
        goalsSnapshot: defaultGoals,
        rankings: [],
        messages: [],
        events,
        discoveredCount: events.filter((e) => e.type === "candidate.discovered")
          .length,
        conversationCount: 0,
        qualifiedCount: 0,
        demo: true,
      },
    ],
  };
}

test("conference graph and people rail preserve the same prior human approvals across scouting runs", () => {
  const events = [
    event("candidate.discovered", "usr_02"),
    event("match.rejected", "usr_16", 2),
  ];
  const state = stateWith(events);
  state.meetings = [
    meeting("usr_16", "accepted"),
    meeting("usr_01", "completed"),
  ];
  const graph = deriveConferenceCircle(state, events);
  const people = deriveConnections(state);
  assert.deepEqual(graph.accepted, ["usr_16"]);
  assert.deepEqual(graph.completed, ["usr_01"]);
  assert.ok(graph.people.some((person) => person.id === "usr_16"));
  assert.ok(!graph.rejected.includes("usr_16"));
  assert.equal(
    people.find((person) => person.person.id === "usr_16")?.status,
    "ready",
  );
  assert.equal(
    people.find((person) => person.person.id === "usr_01")?.status,
    "met",
  );
});

test("historical graph playback shows only persisted prefix activity, without future meeting approval", () => {
  const events = [
    event("candidate.discovered", "usr_01"),
    event("negotiation.started", "usr_01", 2),
    event("negotiation.completed", "usr_01", 3),
  ];
  const state = stateWith(events);
  state.meetings = [meeting("usr_16", "accepted")];
  const prefix = deriveConferenceCircle(state, events.slice(0, 2), false);
  assert.deepEqual(prefix.active, ["usr_01"]);
  assert.deepEqual(prefix.accepted, []);
  assert.deepEqual(
    prefix.people.map((person) => person.id),
    ["usr_01"],
  );
  assert.deepEqual(deriveConferenceCircle(state, events, false).active, []);
});

test("finished or failed runs cannot imply active twin work and previews do not fabricate conversations", () => {
  const events = [
    event("candidate.discovered", "usr_01"),
    event("negotiation.started", "usr_01", 2),
  ];
  assert.deepEqual(
    deriveConferenceCircle(stateWith(events, "running"), events).active,
    ["usr_01"],
  );
  assert.deepEqual(
    deriveConferenceCircle(stateWith(events, "failed"), events).active,
    [],
  );
  const preview = { ...stateWith([]), runs: [] };
  assert.equal(deriveConferenceCircle(preview).people.length, 100);
  assert.deepEqual(deriveConferenceCircle(preview).active, []);
});

test("one-sided or declined meetings never appear approved despite stale qualifying events", () => {
  const events = [
    event("candidate.discovered", "usr_01"),
    event("match.qualified", "usr_01", 2),
  ];
  const state = stateWith(events);
  state.meetings = [
    meeting("usr_01", "declined"),
    meeting("usr_16", "awaiting_approval"),
  ];
  const graph = deriveConferenceCircle(state, events);
  assert.deepEqual(graph.accepted, []);
  assert.ok(!graph.qualified.includes("usr_01"));
  assert.ok(graph.rejected.includes("usr_01"));
  assert.ok(!graph.people.some((person) => person.id === state.activeUserId));
});

test("each new scout grows the live circle without dropping earlier nine or revealing them during replay", () => {
  const first = attendees
    .slice(0, 9)
    .flatMap((person, i) => [
      event("candidate.discovered", person.id, i * 2),
      event("match.qualified", person.id, i * 2 + 1),
    ]);
  const next = attendees
    .slice(9, 18)
    .flatMap((person, i) => [
      event("candidate.discovered", person.id, i * 2),
      event("match.qualified", person.id, i * 2 + 1),
    ]);
  const state = stateWith(next);
  state.runs.unshift({ ...state.runs[0], id: "run_prior", events: first });
  const live = deriveConferenceCircle(state, next);
  assert.equal(live.people.length, 18);
  assert.equal(live.qualified.length, 18);
  assert.equal(live.community.length, 100);
  assert.deepEqual(
    live.people.slice(0, 9).map((person) => person.id),
    attendees.slice(0, 9).map((person) => person.id),
  );
  const replay = deriveConferenceCircle(state, next.slice(0, 1), false);
  assert.equal(replay.people.length, 1);
  assert.equal(replay.qualified.length, 0);
});

test("green connections require the current person’s choice, not twin qualification", () => {
  const state = stateWith([event("match.qualified", "usr_01")]);
  assert.deepEqual(chosenConferencePeople(state), []);
  state.meetings = [
    meeting("usr_02", "awaiting_approval"),
    meeting("usr_03", "accepted"),
    meeting("usr_04", "declined"),
    { ...meeting("usr_self", "awaiting_approval"), ownerUserId: "usr_05", recipientAccepted: false },
    { ...meeting("usr_self", "accepted"), ownerUserId: "usr_06", recipientAccepted: true },
    { ...meeting("usr_07", "accepted"), ownerUserId: "usr_08" },
  ];
  assert.deepEqual(chosenConferencePeople(state), ["usr_02", "usr_03", "usr_06"]);
});
