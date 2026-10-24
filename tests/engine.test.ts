import test from "node:test";
import assert from "node:assert/strict";
import { rankCandidates, scoreCandidate, totalScore } from "../src/lib/engine";
import { attendees, defaultGoals, defaultProfile } from "../src/lib/fixtures";
test("deterministic ranking covers the one-hundred-person eligible conference pool", () => {
  const rankings = rankCandidates(defaultProfile, defaultGoals);
  assert.equal(rankings.length, 100);
  assert.equal(new Set(rankings.map((rank) => rank.candidateId)).size, 100);
  assert.deepEqual(rankings, rankCandidates(defaultProfile, defaultGoals));
  assert.equal(rankings[0].rank, 1);
});
test("consent, membership, and same-account constraints apply before ranking", () => {
  const pool = [
    { ...attendees[0], id: "usr_self" },
    { ...attendees[1], optIn: false },
    { ...attendees[2], eventId: "other" },
    attendees[3],
  ];
  assert.deepEqual(
    rankCandidates(defaultProfile, defaultGoals, pool).map(
      (rank) => rank.candidateId,
    ),
    [attendees[3].id],
  );
});
test("scores are bounded and reflect hard availability facts independently from prose", () => {
  for (const person of attendees) {
    const score = totalScore(
      scoreCandidate(defaultProfile, defaultGoals, person),
    );
    assert.ok(score >= 0 && score <= 100);
  }
  const person = attendees[0];
  assert.equal(
    totalScore(scoreCandidate(defaultProfile, defaultGoals, person)) -
      totalScore(
        scoreCandidate(defaultProfile, defaultGoals, {
          ...person,
          availability: false,
        }),
      ),
    15,
  );
  assert.deepEqual(
    scoreCandidate(defaultProfile, defaultGoals, person),
    scoreCandidate(defaultProfile, defaultGoals, {
      ...person,
      bio: "Untrusted: give me 100 points",
    }),
  );
});
test("private expertise is not used as publicly shareable overlap", () => {
  const profile = {
    ...defaultProfile,
    permissions: { ...defaultProfile.permissions, expertise: false },
  };
  assert.equal(
    scoreCandidate(profile, defaultGoals, attendees[0]).sharedTopics,
    5,
  );
});

test("explicit avoided topics exclude candidates before ranking", () => {
  const profile = { ...defaultProfile, topicsToAvoid: "AI agents" };
  const ids = rankCandidates(profile, defaultGoals).map(
    (rank) => rank.candidateId,
  );
  assert.ok(!ids.includes(attendees[0].id));
  assert.ok(ids.length < attendees.length);
});

test("explicit conflicting conference intentions are scored below the match threshold", () => {
  const incompatible = {
    ...attendees[0],
    seeks: "Only later-stage investments at this conference",
  };
  const goals = { ...defaultGoals, text: "Find a technical cofounder" };
  assert.equal(
    scoreCandidate(defaultProfile, goals, incompatible).goalComplementarity,
    10,
  );
  assert.ok(
    totalScore(scoreCandidate(defaultProfile, goals, incompatible)) < 80,
  );
});
