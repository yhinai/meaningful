import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { NextRequest } from "next/server";

/** Regression boundaries for the continuous Connections → meetup experience. */
test("existing meeting consent survives the simplified popup journey", async (t) => {
  const directory = await mkdtemp(
    path.join(tmpdir(), "meaningfulmeet-simple-"),
  );
  process.env.MEANINGFULMEET_DATA_FILE = path.join(directory, "core.json");
  process.env.MEANINGFULMEET_LOCATION_DATA_FILE = path.join(
    directory,
    "location.json",
  );
  const { mutateDatabase, getDatabase } = await import("../src/lib/store");
  const { defaultProfile, defaultGoals } = await import("../src/lib/fixtures");
  const { rankCandidates, requestIntroduction } =
    await import("../src/lib/engine");
  const { locationResponse } =
    await import("../src/features/find-twin/server/http");
  const { GET: graphGET } = await import("../src/app/api/[...path]/route");
  const eventId = "evt_demo";
  const meetingId = "meeting_already_approved";
  const runId = "run_continuous_flow";
  const meetingParams = { params: Promise.resolve({ eventId, meetingId }) };
  const request = (userId: string, method = "GET", body?: unknown) =>
    new NextRequest(
      `http://localhost/api/events/${eventId}/meetings/${meetingId}/rendezvous`,
      {
        method,
        headers: {
          Cookie: `demo_user=${userId}`,
          "Content-Type": "application/json",
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      },
    );
  const action = (
    userId: string,
    kind: Parameters<typeof locationResponse>[2],
    body?: unknown,
  ) =>
    locationResponse(
      request(
        userId,
        kind === "read" ? "GET" : kind === "share" ? "PUT" : "POST",
        body,
      ),
      meetingParams,
      kind,
    );
  const graph = async () => {
    const result = await graphGET(
      new NextRequest(
        `http://localhost/api/events/${eventId}/twin-runs/${runId}/graph`,
      ),
      {
        params: Promise.resolve({
          path: ["events", eventId, "twin-runs", runId, "graph"],
        }),
      },
    );
    assert.equal(result.status, 200);
    return result.json();
  };
  try {
    await mutateDatabase((db) => {
      const rankings = rankCandidates(defaultProfile, defaultGoals);
      const ranking = rankings.find((item) => item.candidateId === "usr_01")!;
      db.runs.push({
        id: runId,
        eventId,
        ownerUserId: "usr_self",
        status: "completed",
        phase: "Completed",
        createdAt: new Date().toISOString(),
        profileVersion: defaultProfile.version,
        profileSnapshot: structuredClone(defaultProfile),
        goalsSnapshot: structuredClone(defaultGoals),
        rankings,
        messages: [],
        discoveredCount: rankings.length,
        conversationCount: 3,
        qualifiedCount: 2,
        demo: true,
        events: [
          {
            event_id: eventId,
            run_id: runId,
            seq: 1,
            type: "meeting.accepted",
            timestamp: new Date().toISOString(),
            payload: { meeting_id: meetingId, candidate_id: "usr_01" },
          },
        ],
      });
      for (const id of ["match_original", "match_later_run"])
        db.matches.push({
          id,
          runId,
          candidateId: "usr_01",
          ownerUserId: "usr_self",
          score: ranking.score,
          breakdown: ranking.breakdown,
          reasons: ranking.reasons,
          concerns: [],
          evidenceRefs: [],
          scoringVersion: "deterministic-v1",
          status: id === "match_original" ? "accepted" : "suggested",
          demo: true,
        });
      db.meetings.push({
        id: meetingId,
        matchId: "match_original",
        eventId,
        ownerUserId: "usr_self",
        candidateId: "usr_01",
        requesterAccepted: true,
        recipientAccepted: true,
        status: "accepted",
        createdAt: new Date().toISOString(),
      });
    });
    const approvedBefore = structuredClone((await getDatabase()).meetings[0]);

    await t.test(
      "accepted participants enter directly and changing a spot never resets meeting approval",
      async () => {
        assert.equal((await action("usr_self", "read")).status, 200);
        await action("usr_self", "propose", {
          zoneId: "coffee_bar",
          proposalVersion: 0,
        });
        await action("usr_01", "respond", {
          proposalVersion: 1,
          decision: "accept",
        });
        await action("usr_01", "propose", {
          zoneId: "quiet_corner",
          proposalVersion: 1,
        });
        const declinedSpot = await action("usr_self", "respond", {
          proposalVersion: 2,
          decision: "decline",
        });
        assert.equal(declinedSpot.status, 200);
        assert.equal((await declinedSpot.json()).meetingStatus, "accepted");
        const proposed = await action("usr_self", "propose", {
          zoneId: "coffee_bar",
          proposalVersion: 2,
        });
        assert.equal(proposed.status, 200);
        await action("usr_01", "respond", {
          proposalVersion: 3,
          decision: "accept",
        });
        const view = await (await action("usr_self", "read")).json();
        assert.equal(view.spot.status, "confirmed");
        assert.equal(view.self.checkIn, null);
        assert.equal(view.counterpart.checkIn, null);
        assert.deepEqual((await getDatabase()).meetings[0], approvedBefore);
        assert.equal((await getDatabase()).runs[0].events.length, 1);
      },
    );

    await t.test(
      "a repeated suggestion reuses prior consent rather than creating a fresh permission request",
      async () => {
        const reused = await requestIntroduction("usr_self", "match_later_run");
        assert.equal(reused.id, meetingId);
        assert.equal(reused.status, "accepted");
        const db = await getDatabase();
        assert.equal(db.meetings.length, 1);
        assert.equal(
          db.matches.find((match) => match.id === "match_later_run")!.status,
          "accepted",
        );
        assert.equal(
          db.runs[0].events.filter(
            (event) => event.type === "meeting.requested",
          ).length,
          0,
        );
      },
    );

    await t.test(
      "optional zone consent never enters the shared network graph",
      async () => {
        const before = await graph();
        const shared = await action("usr_self", "share", {
          zoneId: "entrance",
          shareMinutes: 15,
        });
        assert.equal(shared.status, 200);
        const counterpart = await (await action("usr_01", "read")).json();
        assert.equal(counterpart.counterpart.checkIn.zoneId, "entrance");
        assert.deepEqual(await graph(), before);
        const stored = (await getDatabase()).runs[0];
        assert.ok(!JSON.stringify(stored).includes("self_reported"));
        assert.ok(!JSON.stringify(stored).includes("entrance"));
      },
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("one current connection represents repeated suggestions and incoming invitations", async () => {
  const { deriveConnections } =
    await import("../src/components/connections/model");
  const { defaultProfile, defaultGoals, attendees } =
    await import("../src/lib/fixtures");
  const { rankCandidates } = await import("../src/lib/engine");
  const candidateId = "usr_01";
  const ranking = rankCandidates(defaultProfile, defaultGoals).find(
    (item) => item.candidateId === candidateId,
  )!;
  const match = {
    id: "match_initial",
    runId: "run_old",
    candidateId,
    ownerUserId: "usr_self",
    score: ranking.score,
    breakdown: ranking.breakdown,
    reasons: ranking.reasons,
    concerns: [],
    evidenceRefs: [],
    scoringVersion: "deterministic-v1",
    status: "accepted" as const,
    demo: true as const,
  };
  const meeting = {
    id: "meeting_current",
    matchId: match.id,
    eventId: "evt_demo",
    ownerUserId: "usr_self",
    candidateId,
    requesterAccepted: true,
    recipientAccepted: true,
    status: "accepted" as const,
    createdAt: "2026-10-24T00:00:00Z",
  };
  const state = {
    profile: defaultProfile,
    goals: defaultGoals,
    candidates: attendees,
    runs: [],
    matches: [
      match,
      {
        ...match,
        id: "match_later",
        runId: "run_new",
        status: "suggested" as const,
      },
    ],
    meetings: [meeting],
    activeUserId: "usr_self",
    demo: true as const,
    integrationStatus: {},
  };
  const ready = deriveConnections(state);
  assert.equal(ready.length, 1);
  assert.equal(ready[0].status, "ready");
  assert.equal(ready[0].meeting!.id, meeting.id);
  const met = deriveConnections({
    ...state,
    meetings: [{ ...meeting, status: "completed" }],
  });
  assert.equal(met.length, 1);
  assert.equal(met[0].status, "met");
  const incoming = deriveConnections({
    ...state,
    activeUserId: candidateId,
    matches: [],
    meetings: [
      { ...meeting, recipientAccepted: false, status: "awaiting_approval" },
    ],
  });
  assert.equal(incoming.length, 1);
  assert.equal(incoming[0].status, "incoming");
  assert.equal(incoming[0].person.id, "usr_self");
});
