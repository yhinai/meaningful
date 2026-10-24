import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
test("persisted demo lifecycle: bounded messages, threshold, replay and mutual approval", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "meaningfulmeet-test-"));
  process.env.MEANINGFULMEET_DATA_FILE = path.join(directory, "demo.json");
  process.env.MEANINGFULMEET_DEMO_STEP_MS = "0";
  const { startRun, getState, requestIntroduction, respondToMeeting } =
    await import("../src/lib/engine");
  const { getDatabase } = await import("../src/lib/store");
  try {
    const id = await startRun("usr_self", "test-request");
    assert.equal(await startRun("usr_self", "test-request"), id);
    let state = await getState("usr_self");
    const deadline = Date.now() + 25000;
    while (state.runs[0].status === "running" && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      state = await getState("usr_self");
    }
    const run = state.runs[0];
    assert.equal(run.status, "completed");
    assert.equal(run.discoveredCount, 9);
    assert.equal(run.conversationCount, 9);
    assert.equal(run.messages.length, 54);
    assert.deepEqual(
      run.events.map((event) => event.seq),
      run.events.map((_, i) => i + 1),
    );
    assert.equal(
      run.events.filter((event) => event.type === "negotiation.started").length,
      9,
    );
    assert.equal(
      run.events.filter((event) => event.type === "match.rejected").length,
      0,
    );
    assert.equal(state.matches.length, 9);
    assert.ok(state.matches.every((match) => match.score >= 80));
    const match = state.matches[0];
    const meeting = await requestIntroduction("usr_self", match.id);
    assert.equal(meeting.status, "awaiting_approval");
    assert.equal(meeting.recipientAccepted, false);
    assert.equal(
      (await requestIntroduction("usr_self", match.id)).id,
      meeting.id,
    );
    await assert.rejects(
      respondToMeeting("usr_self", meeting.id, true),
      /other attendee/,
    );
    const accepted = await respondToMeeting(
      match.candidateId,
      meeting.id,
      true,
    );
    assert.equal(accepted.status, "accepted");
    const db = await getDatabase();
    assert.ok(
      db.integrationEvents.some(
        (event) =>
          event.type === "meeting.accepted" && event.meeting_id === meeting.id,
      ),
    );
    assert.equal(
      (await getState("usr_self")).runs[0].events.length,
      run.events.length + 2,
    );
    const secondRun = await startRun("usr_self", "second-run");
    const { PATCH, DELETE } = await import("../src/app/api/[...path]/route");
    const { NextRequest } = await import("next/server");
    const profile = (await getState("usr_self")).profile;
    const patch = await PATCH(
      new NextRequest("http://localhost/api/me/twin", {
        method: "PATCH",
        body: JSON.stringify({
          permissions: { ...profile.permissions, seeks: false },
        }),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ path: ["me", "twin"] }) },
    );
    assert.equal(patch.status, 200);
    const revoked = (await getState("usr_self")).runs.find(
      (item) => item.id === secondRun,
    )!;
    assert.equal(revoked.status, "failed");
    assert.equal(revoked.events.at(-1)?.payload.reason, "consent_revoked");
    await assert.rejects(startRun("usr_self", "third-run"), /approve sharing/);
    const wrongDelete = await DELETE(
      new NextRequest("http://localhost/api/demo/state", { method: "DELETE" }),
      { params: Promise.resolve({ path: ["demo", "state"] }) },
    );
    assert.equal(wrongDelete.status, 404);
    await new Promise((resolve) => setTimeout(resolve, 250));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
