import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

test("scouts reserve nine fresh people, retain eighteen matches, and stop honestly at exhaustion", async () => {
  const directory = await mkdtemp(
    path.join(tmpdir(), "meaningfulmeet-batches-"),
  );
  process.env.MEANINGFULMEET_DATA_FILE = path.join(directory, "demo.json");
  process.env.MEANINGFULMEET_DEMO_STEP_MS = "0";
  const { startRun, getState, freshCandidateRankings } =
    await import("../src/lib/engine");
  const { mutateDatabase, getDatabase } = await import("../src/lib/store");
  const { attendees } = await import("../src/lib/fixtures");
  async function completed(id: string) {
    const deadline = Date.now() + 10000;
    while (Date.now() < deadline) {
      const state = await getState("usr_self");
      const run = state.runs.find((run) => run.id === id)!;
      if (run.status !== "running") {
        assert.equal(run.status, "completed");
        return { state, run };
      }
      await new Promise((resolve) => setTimeout(resolve, 15));
    }
    throw new Error("Scout did not complete");
  }
  try {
    const initial = await getState("usr_self");
    assert.equal(initial.candidates.length, 100);
    assert.equal(new Set(attendees.map((person) => person.id)).size, 100);
    assert.equal(attendees[0].id, "usr_01");
    assert.equal(attendees.at(-1)?.id, "usr_100");
    // Declined introductions still represent a prior contact, including when
    // the current attendee was the recipient rather than the requester.
    await mutateDatabase((db) => {
      db.meetings.push({
        id: "meeting_previous",
        matchId: "match_previous",
        eventId: attendees[0].eventId,
        ownerUserId: "usr_21",
        candidateId: "usr_self",
        requesterAccepted: true,
        recipientAccepted: false,
        status: "declined",
        createdAt: new Date().toISOString(),
      });
    });
    const first = await startRun("usr_self", "batch-one");
    const concurrent = await Promise.all([
      startRun("usr_self", "batch-one"),
      startRun("usr_self", "another-tab"),
    ]);
    assert.deepEqual(concurrent, [first, first]);
    const firstResult = await completed(first);
    assert.equal(firstResult.run.rankings.length, 9);
    assert.ok(
      !firstResult.run.rankings.some((rank) => rank.candidateId === "usr_21"),
    );
    assert.equal(firstResult.run.qualifiedCount, 9);
    assert.equal(firstResult.run.messages.length, 54);
    assert.equal(firstResult.state.matches.length, 9);
    assert.equal(await startRun("usr_self", "batch-one"), first);
    const preservedMatches = structuredClone(firstResult.state.matches);
    const second = await startRun("usr_self", "batch-two");
    const secondResult = await completed(second);
    assert.equal(secondResult.run.qualifiedCount, 9);
    assert.equal(secondResult.state.matches.length, 18);
    assert.deepEqual(secondResult.state.matches.slice(0, 9), preservedMatches);
    const ids = [...firstResult.run.rankings, ...secondResult.run.rankings].map(
      (rank) => rank.candidateId,
    );
    assert.equal(new Set(ids).size, 18);
    assert.equal(secondResult.state.scouting?.discoveredTotal, 18);
    assert.equal(secondResult.state.scouting?.matchedTotal, 18);
    for (const run of secondResult.state.runs) {
      assert.deepEqual(
        run.events.map((event) => event.seq),
        run.events.map((_, index) => index + 1),
      );
      assert.ok(run.messages.every((message) => message.demo));
      for (const ranking of run.rankings) {
        assert.equal(
          run.messages.filter(
            (message) => message.candidateId === ranking.candidateId,
          ).length,
          6,
        );
        const match = secondResult.state.matches.find(
          (match) => match.candidateId === ranking.candidateId,
        )!;
        assert.equal(
          match.score,
          Object.values(match.breakdown).reduce((sum, value) => sum + value, 0),
        );
        assert.ok(match.score >= 80);
      }
    }
    // Model an existing saved history: every eligible person except three is
    // already reserved. Its rankings must never be selected by another scout.
    await mutateDatabase((db) => {
      const profile = db.profiles.usr_self;
      const goals = db.goals.usr_self;
      const remaining = freshCandidateRankings(db, "usr_self", profile, goals);
      const history = structuredClone(db.runs[0]);
      history.id = "run_saved_history";
      history.rankings = remaining.slice(0, -3);
      history.messages = [];
      history.events = [];
      db.runs.push(history);
    });
    const beforeFinal = await getState("usr_self");
    assert.equal(beforeFinal.scouting?.remainingEligible, 3);
    const finalId = await startRun("usr_self", "last-three");
    const final = await completed(finalId);
    assert.equal(final.run.rankings.length, 3);
    assert.equal(final.run.qualifiedCount, 3);
    assert.equal(final.state.matches.length, 21);
    assert.equal(final.state.scouting?.remainingEligible, 0);
    assert.equal(final.state.scouting?.exhausted, true);
    const runCount = final.state.runs.length;
    await assert.rejects(
      startRun("usr_self", "exhausted"),
      /everyone who currently fits/,
    );
    assert.equal((await getDatabase()).runs.length, runCount);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
