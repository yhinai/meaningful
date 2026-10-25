import { randomUUID } from "node:crypto";
import { attendees, defaultGoals, defaultProfile, EVENT_ID } from "./fixtures";
import { getDatabase, mutateDatabase } from "./store";
import type {
  CandidateRanking,
  ConferenceGoals,
  Database,
  DemoState,
  Person,
  RunEvent,
  ScoreBreakdown,
  TwinProfile,
  TwinRun,
} from "./types";
const activeJobs = new Set<string>();
export const SCOUT_BATCH_SIZE = 9;
const pause = (ms: number) => {
  const override = process.env.MEANINGFULMEET_DEMO_STEP_MS;
  const delay =
    override !== undefined && Number.isFinite(Number(override))
      ? Math.max(0, Math.min(1000, Number(override)))
      : ms;
  return new Promise((resolve) => setTimeout(resolve, delay));
};
const stopwords = new Set([
  "the",
  "and",
  "for",
  "with",
  "that",
  "this",
  "from",
  "are",
  "our",
  "your",
  "their",
  "looking",
  "find",
  "building",
  "thoughtful",
  "technical",
  "collaborators",
  "collaboration",
  "partnership",
  "early",
  "stage",
  "new",
  "open",
]);
const terms = (text: string): string[] =>
  (text.toLowerCase().match(/[a-z]{3,}/g) || []).filter(
    (term) => !stopwords.has(term),
  );
const overlaps = (a: string, b: string) =>
  terms(a).some((term) => terms(b).includes(term));
function goalFocusConflict(goals: ConferenceGoals, person: Person) {
  return (
    /cofounder/i.test(goals.text) &&
    /later-stage investments|climate customers|design customers/i.test(
      person.seeks,
    )
  );
}
export function scoreCandidate(
  profile: TwinProfile,
  goals: ConferenceGoals,
  person: Person,
): ScoreBreakdown {
  const interest = `${goals.text} ${goals.categories.join(" ")} ${profile.permissions.seeks ? profile.seeks : ""}`;
  const approvedSkills = profile.permissions.expertise ? profile.expertise : [];
  return {
    goalComplementarity: goalFocusConflict(goals, person)
      ? 10
      : overlaps(interest, `${person.offers} ${person.topics.join(" ")}`)
        ? 35
        : 15,
    expertiseAlignment:
      overlaps(
        profile.permissions.offers ? profile.offers : "",
        person.seeks,
      ) || person.seeks.includes("cofounder")
        ? 25
        : 16,
    sharedTopics: person.topics.some((topic) =>
      approvedSkills.some((skill) => overlaps(skill, topic)),
    )
      ? 15
      : 5,
    mutualInterest: person.availability ? 15 : 0,
    conversationFit:
      profile.conversationStyle === person.conversationStyle ? 10 : 6,
  };
}
export const totalScore = (breakdown: ScoreBreakdown) =>
  Object.values(breakdown).reduce((a, b) => a + b, 0);
export function rankCandidates(
  profile: TwinProfile,
  goals: ConferenceGoals,
  pool = attendees,
): CandidateRanking[] {
  return pool
    .filter(
      (person) =>
        person.id !== profile.id &&
        person.eventId === EVENT_ID &&
        person.optIn &&
        (!profile.topicsToAvoid.trim() ||
          !profile.topicsToAvoid
            .split(",")
            .map((topic) => topic.trim().toLowerCase())
            .filter(Boolean)
            .some((topic) =>
              person.topics.some((value) =>
                value.toLowerCase().includes(topic),
              ),
            )),
    )
    .map((person) => {
      const breakdown = scoreCandidate(profile, goals, person);
      return {
        candidateId: person.id,
        rank: 0,
        score: totalScore(breakdown),
        breakdown,
        reasons: [
          `${person.offers} complements your conference goals.`,
          person.availability
            ? "Open to new conversations at this event."
            : "Availability needs to be confirmed.",
        ],
        evidencePaths: [
          `You → ATTENDS → MeaningfulMeet Conference ← ATTENDS ← ${person.name}`,
          ...(profile.permissions.expertise
            ? person.topics
                .filter((topic) =>
                  profile.expertise.some((skill) => overlaps(skill, topic)),
                )
                .map(
                  (topic) =>
                    `You → HAS_SKILL → ${topic} ← INTERESTED_IN ← ${person.name}`,
                )
            : []),
        ],
      };
    })
    .sort(
      (a, b) => b.score - a.score || a.candidateId.localeCompare(b.candidateId),
    )
    .map((ranking, i) => ({ ...ranking, rank: i + 1 }));
}
/** Selection is reserved inside the same serialized transaction as the run. */
export function scoutedCandidateIds(db: Database, userId: string): Set<string> {
  const ids = new Set(
    db.runs
      .filter((run) => run.ownerUserId === userId && run.eventId === EVENT_ID)
      .flatMap((run) => run.rankings.map((rank) => rank.candidateId)),
  );
  for (const match of db.matches.filter(
    (match) => match.ownerUserId === userId,
  ))
    ids.add(match.candidateId);
  for (const meeting of db.meetings.filter(
    (meeting) => meeting.eventId === EVENT_ID,
  )) {
    if (meeting.ownerUserId === userId) ids.add(meeting.candidateId);
    if (meeting.candidateId === userId) ids.add(meeting.ownerUserId);
  }
  return ids;
}
export function freshCandidateRankings(
  db: Database,
  userId: string,
  profile: TwinProfile,
  goals: ConferenceGoals,
) {
  const used = scoutedCandidateIds(db, userId);
  return rankCandidates(profile, goals).filter(
    (rank) => rank.score >= 80 && !used.has(rank.candidateId),
  );
}
function scoutingSummary(
  db: Database,
  userId: string,
  profile: TwinProfile,
  goals: ConferenceGoals,
) {
  const used = scoutedCandidateIds(db, userId);
  const discovered = new Set(
    db.runs
      .filter((run) => run.ownerUserId === userId && run.eventId === EVENT_ID)
      .flatMap((run) =>
        run.events
          .filter((event) => event.type === "candidate.discovered")
          .map((event) => String(event.payload.candidate_id)),
      ),
  );
  const remainingEligible = freshCandidateRankings(
    db,
    userId,
    profile,
    goals,
  ).length;
  return {
    conferenceSize: attendees.length,
    batchSize: SCOUT_BATCH_SIZE,
    discoveredTotal: discovered.size,
    matchedTotal: new Set(
      db.matches
        .filter(
          (match) =>
            match.ownerUserId === userId && match.status !== "declined",
        )
        .map((match) => match.candidateId),
    ).size,
    remainingEligible,
    remainingAttendees: attendees.filter(
      (person) => person.id !== userId && person.optIn && !used.has(person.id),
    ).length,
    exhausted: remainingEligible === 0,
  };
}
function append(
  run: TwinRun,
  type: string,
  payload: Record<string, unknown>,
): RunEvent {
  const event = {
    event_id: run.eventId,
    run_id: run.id,
    seq: run.events.length + 1,
    type,
    timestamp: new Date().toISOString(),
    payload,
  };
  run.events.push(event);
  return event;
}
function ensureProfile(db: Database, userId: string) {
  if (!db.profiles[userId]) {
    if (userId === "usr_self") {
      db.profiles[userId] = structuredClone(defaultProfile);
      db.goals[userId] = structuredClone(defaultGoals);
      return;
    }
    const candidate = attendees.find((person) => person.id === userId);
    if (!candidate) throw new Error("Unknown demo attendee");
    db.profiles[userId] = {
      ...structuredClone(defaultProfile),
      id: userId,
      name: candidate.name,
      role: candidate.role,
      company: candidate.company,
      bio: candidate.bio,
      expertise: candidate.expertise,
      offers: candidate.offers,
      seeks: candidate.seeks,
    };
    db.goals[userId] = { ...defaultGoals, text: candidate.seeks };
  }
}
export async function getState(userId = "usr_self"): Promise<DemoState> {
  const db = await mutateDatabase((db) => {
    ensureProfile(db, userId);
    return db;
  });
  for (const run of db.runs.filter((run) => run.status === "running"))
    void executeRun(run.id);
  const runs = db.runs.filter((run) => run.ownerUserId === userId);
  const latest = runs.at(-1);
  return {
    scouting: scoutingSummary(
      db,
      userId,
      db.profiles[userId],
      db.goals[userId] || defaultGoals,
    ),
    profile: db.profiles[userId],
    goals: db.goals[userId] || defaultGoals,
    candidates: attendees.map((person) => ({
      ...person,
      score:
        db.matches
          .filter(
            (match) =>
              match.ownerUserId === userId && match.candidateId === person.id,
          )
          .at(-1)?.score ??
        latest?.rankings.find((rank) => rank.candidateId === person.id)
          ?.score ??
        0,
    })),
    runs,
    matches: db.matches.filter((match) => match.ownerUserId === userId),
    meetings: db.meetings.filter(
      (meeting) =>
        meeting.ownerUserId === userId || meeting.candidateId === userId,
    ),
    activeUserId: userId,
    demo: true,
    integrationStatus: {
      FalkorDB: "Not connected · local evidence paths",
      OpenAI: "Not connected · seeded transcript replay",
      TrueForge: "Not connected",
      BrightData: "Not connected · fictional attendees",
      Supabase: "Not connected · local demo persistence",
    },
  };
}
export async function startRun(userId: string, idempotencyKey?: string) {
  const id = await mutateDatabase((db) => {
    ensureProfile(db, userId);
    const existing = db.runs.find(
      (run) =>
        run.ownerUserId === userId &&
        (run.status === "running" ||
          (idempotencyKey && run.idempotencyKey === idempotencyKey)),
    );
    if (existing) return existing.id;
    const profile = structuredClone(db.profiles[userId]);
    const goals = structuredClone(db.goals[userId] || defaultGoals);
    if (
      !profile.name.trim() ||
      profile.name === "Your name" ||
      !profile.expertise.length ||
      !profile.permissions.seeks ||
      !profile.seeks.trim() ||
      !goals.text.trim() ||
      goals.text === "Set your conference goal"
    )
      throw new Error(
        "Train your twin, approve sharing what you seek, and set a conference goal before scouting.",
      );
    const rankings = freshCandidateRankings(db, userId, profile, goals)
      .slice(0, SCOUT_BATCH_SIZE)
      .map((ranking, index) => ({ ...ranking, rank: index + 1 }));
    if (!rankings.length)
      throw new Error(
        "You’ve explored everyone who currently fits your goals. Your earlier matches are saved. Update your intention to explore different eligible people.",
      );
    const run: TwinRun = {
      batchSize: SCOUT_BATCH_SIZE,
      id: `run_${randomUUID()}`,
      eventId: EVENT_ID,
      ownerUserId: userId,
      status: "running",
      phase: "Discovering your people",
      createdAt: new Date().toISOString(),
      profileVersion: profile.version,
      profileSnapshot: profile,
      goalsSnapshot: goals,
      rankings,
      messages: [],
      events: [],
      discoveredCount: 0,
      conversationCount: 0,
      qualifiedCount: 0,
      idempotencyKey,
      demo: true,
    };
    append(run, "run.started", {
      demo: true,
      mode: "seeded_transcript_replay",
      profile_version: profile.version,
      batch_size: rankings.length,
    });
    db.runs.push(run);
    return run.id;
  });
  void executeRun(id);
  return id;
}
async function step(
  runId: string,
  type: string,
  payload: Record<string, unknown>,
  update?: (run: TwinRun, db: Database) => void,
) {
  return mutateDatabase((db) => {
    const run = db.runs.find((run) => run.id === runId);
    if (!run || run.status !== "running") return false;
    update?.(run, db);
    append(run, type, payload);
    return true;
  });
}
async function executeRun(runId: string) {
  if (activeJobs.has(runId)) return;
  activeJobs.add(runId);
  try {
    let run = (await getDatabase()).runs.find((run) => run.id === runId);
    if (!run || run.status !== "running") return;
    for (let i = run.discoveredCount; i < run.rankings.length; i++) {
      const ranking = run.rankings[i];
      await pause(550);
      if (
        !(await step(
          runId,
          "candidate.discovered",
          {
            candidate_id: ranking.candidateId,
            rank: ranking.rank,
            score: ranking.score,
            reasons: ranking.reasons,
          },
          (run) => {
            run.discoveredCount = i + 1;
          },
        ))
      )
        return;
      await step(runId, "candidate.ranked", {
        candidate_id: ranking.candidateId,
        rank: ranking.rank,
        score: ranking.score,
      });
    }
    run = (await getDatabase()).runs.find((run) => run.id === runId)!;
    if (!run.events.some((event) => event.type === "shortlist.ready"))
      await step(
        runId,
        "shortlist.ready",
        {
          candidate_ids: run.rankings
            .slice(0, run.batchSize ?? 3)
            .map((rank) => rank.candidateId),
        },
        (run) => {
          run.phase = "Your twins are talking";
        },
      );
    for (
      let index = 0;
      index < Math.min(run.batchSize ?? 3, run.rankings.length);
      index++
    ) {
      const ranking = run.rankings[index];
      const person = attendees.find(
        (candidate) => candidate.id === ranking.candidateId,
      )!;
      const current = (await getDatabase()).runs.find(
        (run) => run.id === runId,
      )!;
      if (
        current.events.some(
          (event) =>
            event.type === "negotiation.completed" &&
            event.payload.candidate_id === person.id,
        )
      )
        continue;
      if (
        !current.events.some(
          (event) =>
            event.type === "negotiation.started" &&
            event.payload.candidate_id === person.id,
        )
      )
        await step(runId, "negotiation.started", {
          candidate_id: person.id,
          demo: true,
        });
      const approved = current.profileSnapshot;
      const goal = current.goalsSnapshot;
      const commitmentMismatch = goalFocusConflict(goal, person);
      const transcript = [
        `My person is exploring ${approved.permissions.seeks ? approved.seeks : "a collaboration using approved profile fields"}. What kind of collaboration interests you?`,
        `I can share ${person.offers}. I am looking for ${person.seeks.toLowerCase()}.`,
        `The conference goal is: ${approved.permissions.seeks ? goal.text : "explore mutually relevant professional connections"}. What would a useful first conversation look like?`,
        commitmentMismatch
          ? `My stated conference focus is ${person.seeks.toLowerCase()}. That differs from a cofounder search.`
          : `A short exchange about ${person.topics[0].toLowerCase()} and what we could build together would be useful.`,
        `Thank you. ${commitmentMismatch ? "That commitment constraint may limit the fit." : "There appears to be complementary experience."} I can only suggest an introduction for human review.`,
        `Agreed. ${commitmentMismatch ? "Please record that limitation." : "My person can decide whether to accept an introduction."} Neither twin can confirm a meeting.`,
      ];
      const existing = current.messages.filter(
        (message) => message.candidateId === person.id,
      ).length;
      for (let turn = existing; turn < 6; turn++) {
        await pause(850);
        await step(
          runId,
          "twin.message",
          {
            candidate_id: person.id,
            speaker: turn % 2 === 0 ? "your_twin" : "candidate_twin",
            text: transcript[turn],
            demo: true,
          },
          (run) => {
            run.messages.push({
              id: `${run.id}_${person.id}_${turn}`,
              candidateId: person.id,
              speaker: turn % 2 === 0 ? "your_twin" : "candidate_twin",
              text: transcript[turn],
              sharedFacts: turn % 2 === 0 ? [] : [person.offers],
              questions:
                turn === 0 ? ["What kind of collaboration interests you?"] : [],
              demo: true,
            });
          },
        );
      }
      await step(
        runId,
        "negotiation.completed",
        { candidate_id: person.id, messages: 6, demo: true },
        (run) => {
          run.conversationCount = index + 1;
        },
      );
      const breakdown = {
        ...ranking.breakdown,
        goalComplementarity: commitmentMismatch
          ? 10
          : ranking.breakdown.goalComplementarity,
      };
      const score = totalScore(breakdown);
      await step(runId, "match.scored", {
        candidate_id: person.id,
        score,
        breakdown,
        scoring_version: "deterministic-v1",
      });
      await step(
        runId,
        score >= 80 ? "match.qualified" : "match.rejected",
        { candidate_id: person.id, score },
        (run, db) => {
          if (score >= 80) {
            run.qualifiedCount++;
            if (
              !db.matches.some(
                (match) =>
                  match.runId === runId && match.candidateId === person.id,
              )
            )
              db.matches.push({
                id: `match_${run.id}_${person.id}`,
                runId,
                candidateId: person.id,
                ownerUserId: run.ownerUserId,
                score,
                breakdown,
                reasons: ranking.reasons,
                concerns: [
                  "Seeded demo conversation; verify fit directly with the attendee.",
                ],
                evidenceRefs: run.messages
                  .filter((message) => message.candidateId === person.id)
                  .map((message) => message.id),
                scoringVersion: "deterministic-v1",
                status: "suggested",
                demo: true,
              });
          }
        },
      );
    }
    await step(runId, "run.completed", { demo: true }, (run) => {
      run.status = "completed";
      run.phase = "Your connections are ready";
    });
  } catch (error) {
    await mutateDatabase((db) => {
      const run = db.runs.find((run) => run.id === runId);
      if (run) {
        run.status = "failed";
        run.phase = "Run interrupted. Start again to retry.";
        append(run, "run.failed", {
          reason: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });
  } finally {
    activeJobs.delete(runId);
  }
}
export async function requestIntroduction(userId: string, matchId: string) {
  return mutateDatabase((db) => {
    const match = db.matches.find(
      (match) => match.id === matchId && match.ownerUserId === userId,
    );
    if (!match) throw new Error("Match not found");
    if (match.score < 80) throw new Error("Match does not meet the threshold");
    if (match.status === "declined") throw new Error("This match was declined");
    const duplicate = db.meetings.find(
      (meeting) =>
        meeting.ownerUserId === userId &&
        meeting.candidateId === match.candidateId &&
        meeting.status !== "declined",
    );
    if (duplicate) {
      match.status =
        duplicate.status === "accepted" || duplicate.status === "completed"
          ? "accepted"
          : "requested";
      return duplicate;
    }
    const meeting = {
      id: `meeting_${randomUUID()}`,
      matchId,
      eventId: EVENT_ID,
      ownerUserId: userId,
      candidateId: match.candidateId,
      requesterAccepted: true,
      recipientAccepted: false,
      status: "awaiting_approval" as const,
      createdAt: new Date().toISOString(),
    };
    db.meetings.push(meeting);
    match.status = "requested";
    const run = db.runs.find((run) => run.id === match.runId);
    if (run)
      append(run, "meeting.requested", {
        meeting_id: meeting.id,
        candidate_id: match.candidateId,
      });
    return meeting;
  });
}
export async function respondToMeeting(
  userId: string,
  meetingId: string,
  accept: boolean,
) {
  return mutateDatabase((db) => {
    const meeting = db.meetings.find((meeting) => meeting.id === meetingId);
    if (!meeting || meeting.candidateId !== userId)
      throw new Error("Only the other attendee can respond");
    if (meeting.status !== "awaiting_approval")
      throw new Error("Meeting already answered");
    meeting.recipientAccepted = accept;
    meeting.status =
      accept && meeting.requesterAccepted ? "accepted" : "declined";
    const match = db.matches.find((match) => match.id === meeting.matchId)!;
    match.status = meeting.status;
    const run = db.runs.find((run) => run.id === match.runId);
    if (run)
      append(run, accept ? "meeting.accepted" : "meeting.declined", {
        meeting_id: meeting.id,
        candidate_id: userId,
      });
    if (accept)
      db.integrationEvents.push({
        type: "meeting.accepted",
        user_id: meeting.ownerUserId,
        event_id: EVENT_ID,
        meeting_id: meeting.id,
        timestamp: new Date().toISOString(),
        consent_scope: "approved_meeting_metadata",
      });
    return meeting;
  });
}
