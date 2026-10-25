import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  attendees,
  defaultGoals,
  defaultProfile,
  EVENT_ID,
} from "@/lib/fixtures";
import {
  getState,
  requestIntroduction,
  respondToMeeting,
  startRun,
} from "@/lib/engine";
import { getDatabase, mutateDatabase, resetDatabase } from "@/lib/store";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const permissionSchema = z.object({
  bio: z.boolean(),
  expertise: z.boolean(),
  offers: z.boolean(),
  seeks: z.boolean(),
  topics: z.boolean(),
  company: z.boolean(),
});
const profileSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    role: z.string().max(150),
    company: z.string().max(150),
    bio: z.string().max(3000),
    expertise: z.array(z.string().max(100)).max(20),
    offers: z.string().max(2000),
    seeks: z.string().max(2000),
    conversationStyle: z.string().max(100),
    topicsToAvoid: z.string().max(1000),
    permissions: permissionSchema,
  })
  .partial();
const goalsSchema = z.object({
  text: z.string().trim().min(1).max(3000),
  categories: z.array(z.string().max(80)).max(8),
  industry: z.string().max(150),
  stage: z.string().max(150),
  outcome: z.string().max(1000),
});
const actionSchema = z.object({
  action: z.enum([
    "start-run",
    "request-intro",
    "decline-match",
    "switch-user",
    "respond-meeting",
    "complete-meeting",
    "feedback",
    "reset",
  ]),
  matchId: z.string().optional(),
  meetingId: z.string().optional(),
  userId: z.string().optional(),
  accept: z.boolean().optional(),
  relevance: z.number().int().min(1).max(5).optional(),
  note: z.string().max(3000).optional(),
});
const limits = new Map<string, { time: number; count: number }>();
function user(request: NextRequest) {
  const id = request.cookies.get("demo_user")?.value || "usr_self";
  if (id !== "usr_self" && !attendees.some((candidate) => candidate.id === id))
    throw new Error("Unknown demo account");
  return id;
}
function errorResponse(error: unknown) {
  return NextResponse.json(
    { error: error instanceof Error ? error.message : "Request failed" },
    { status: error instanceof z.ZodError ? 400 : 400 },
  );
}
function checkEvent(path: string[]) {
  if (path[0] === "events" && path[1] !== EVENT_ID)
    throw new Error("Event membership required");
}
function throttle(userId: string) {
  const now = Date.now();
  const item = limits.get(userId);
  if (!item || now - item.time > 60000) {
    limits.set(userId, { time: now, count: 1 });
    return;
  }
  if (++item.count > 60)
    throw new Error("Too many requests. Please try again in a minute.");
}
function integrationEvent(type: string, userId: string, meetingId: string) {
  return {
    type,
    user_id: userId,
    event_id: EVENT_ID,
    meeting_id: meetingId,
    timestamp: new Date().toISOString(),
    consent_scope: "approved_meeting_metadata",
  };
}
async function complete(
  userId: string,
  meetingId: string,
  feedback?: { relevance: number; note: string },
) {
  return mutateDatabase((db) => {
    const meeting = db.meetings.find(
      (item) => item.id === meetingId && item.ownerUserId === userId,
    );
    if (!meeting) throw new Error("Meeting not found");
    if (!["accepted", "completed"].includes(meeting.status))
      throw new Error("Both people must accept first");
    if (feedback) {
      meeting.feedback = feedback;
      db.integrationEvents.push(
        integrationEvent("meeting.feedback_submitted", userId, meetingId),
      );
    } else if (meeting.status !== "completed") {
      meeting.status = "completed";
      db.integrationEvents.push(
        integrationEvent("meeting.completed", userId, meetingId),
      );
    }
    return meeting;
  });
}
async function stream(request: NextRequest, runId: string, userId: string) {
  const state = await getState(userId);
  if (!state.runs.some((run) => run.id === runId))
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  let sequence = Number(
    request.headers.get("last-event-id") ||
      request.nextUrl.searchParams.get("lastSeq") ||
      0,
  );
  if (!Number.isFinite(sequence) || sequence < 0) sequence = 0;
  const encoder = new TextEncoder();
  let timer: ReturnType<typeof setInterval> | undefined;
  let stopped = false;
  const body = new ReadableStream({
    start(controller) {
      const send = async () => {
        if (stopped) return;
        try {
          const db = await getDatabase();
          const run = db.runs.find(
            (run) => run.id === runId && run.ownerUserId === userId,
          );
          if (!run) {
            stopped = true;
            controller.close();
            if (timer) clearInterval(timer);
            return;
          }
          for (const event of run.events.filter(
            (event) => event.seq > sequence,
          )) {
            controller.enqueue(
              encoder.encode(
                `id: ${event.seq}\ndata: ${JSON.stringify(event)}\n\n`,
              ),
            );
            sequence = event.seq;
          }
          if (run.status !== "running") {
            stopped = true;
            controller.close();
            if (timer) clearInterval(timer);
          }
        } catch {
          stopped = true;
          if (timer) clearInterval(timer);
          try {
            controller.error(new Error("Event stream interrupted"));
          } catch {}
        }
      };
      timer = setInterval(() => void send(), 250);
      void send();
      request.signal.addEventListener("abort", () => {
        stopped = true;
        if (timer) clearInterval(timer);
        try {
          controller.close();
        } catch {}
      });
    },
    cancel() {
      stopped = true;
      if (timer) clearInterval(timer);
    },
  });
  return new Response(body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    const { path } = await params;
    checkEvent(path);
    const userId = user(request);
    const key = path.join("/");
    if (key.includes("/stream")) return stream(request, path[3], userId);
    const state = await getState(userId);
    if (key === "demo/state") return NextResponse.json(state);
    if (key === "me/twin") return NextResponse.json(state.profile);
    if (path[2] === "goals") return NextResponse.json(state.goals);
    if (path[2] === "twin-runs") {
      const run = state.runs.find((run) => run.id === path[3]);
      if (!run)
        return NextResponse.json({ error: "Run not found" }, { status: 404 });
      if (path[4] === "graph") {
        const statusFor = (candidateId: string) => {
          const events = run.events.filter(
            (event) => event.payload.candidate_id === candidateId,
          );
          if (events.some((event) => event.type === "meeting.accepted"))
            return "accepted";
          if (events.some((event) => event.type === "match.qualified"))
            return "qualified";
          if (events.some((event) => event.type === "match.rejected"))
            return "rejected";
          if (
            events.some((event) => event.type === "negotiation.started") &&
            !events.some((event) => event.type === "negotiation.completed")
          )
            return "negotiating";
          if (
            run.events.some(
              (event) =>
                event.type === "shortlist.ready" &&
                (event.payload.candidate_ids as string[])?.includes(
                  candidateId,
                ),
            )
          )
            return "shortlisted";
          return "candidate";
        };
        const discovered = run.rankings.slice(0, run.discoveredCount);
        return NextResponse.json({
          nodes: [
            { id: userId, type: "self" },
            ...discovered.map((rank) => ({
              id: rank.candidateId,
              type: statusFor(rank.candidateId),
              score:
                run.events
                  .filter(
                    (event) =>
                      event.type === "match.scored" &&
                      event.payload.candidate_id === rank.candidateId,
                  )
                  .at(-1)?.payload.score || rank.score,
              evidence: rank.evidencePaths,
            })),
          ],
          edges: discovered.map((rank) => {
            const status = statusFor(rank.candidateId);
            return {
              id: `edge_${rank.candidateId}`,
              source: userId,
              target: rank.candidateId,
              type:
                status === "accepted"
                  ? "mutual_meeting"
                  : status === "qualified"
                    ? "qualified_match"
                    : status === "negotiating"
                      ? "twin_conversation"
                      : "candidate_match",
              animated: status === "negotiating",
            };
          }),
          last_seq: run.events.length,
        });
      }
      return NextResponse.json(run);
    }
    if (path[2] === "matches") {
      const match = path[3]
        ? state.matches.find((match) => match.id === path[3])
        : state.matches;
      return match
        ? NextResponse.json(match)
        : NextResponse.json({ error: "Match not found" }, { status: 404 });
    }
    if (path[2] === "meetings") return NextResponse.json(state.meetings);
    if (path[2] === "my-experience") {
      const db = await getDatabase();
      return NextResponse.json({
        user_id: userId,
        event_id: EVENT_ID,
        goals: state.goals,
        meetings: state.meetings
          .filter((meeting) =>
            ["accepted", "completed"].includes(meeting.status),
          )
          .map(({ id, status, candidateId, createdAt }) => ({
            id,
            status,
            candidateId,
            createdAt,
          })),
        match_explanations: state.matches.map(({ id, reasons, score }) => ({
          id,
          reasons,
          score,
        })),
        events: db.integrationEvents.filter(
          (event) => event.user_id === userId,
        ),
      });
    }
    return NextResponse.json({ error: "Endpoint not found" }, { status: 404 });
  } catch (error) {
    return errorResponse(error);
  }
}
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    const { path } = await params;
    if (path.join("/") !== "me/twin")
      return NextResponse.json(
        { error: "Endpoint not found" },
        { status: 404 },
      );
    const userId = user(request);
    throttle(userId);
    await getState(userId);
    const input = profileSchema.parse(await request.json());
    const profile = await mutateDatabase((db) => {
      const prior = db.profiles[userId];
      const revoked =
        input.permissions &&
        Object.keys(input.permissions).some(
          (key) =>
            prior.permissions[key as keyof typeof prior.permissions] &&
            !input.permissions![key as keyof typeof input.permissions],
        );
      db.profiles[userId] = { ...prior, ...input, version: prior.version + 1 };
      if (revoked) {
        for (const run of db.runs.filter(
          (run) => run.ownerUserId === userId && run.status === "running",
        )) {
          run.status = "failed";
          run.phase =
            "Sharing permissions changed. Start a new run with your updated consent.";
          run.events.push({
            event_id: EVENT_ID,
            run_id: run.id,
            seq: run.events.length + 1,
            type: "run.failed",
            timestamp: new Date().toISOString(),
            payload: { reason: "consent_revoked" },
          });
        }
      }
      return db.profiles[userId];
    });
    return NextResponse.json(profile);
  } catch (error) {
    return errorResponse(error);
  }
}
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    const { path } = await params;
    checkEvent(path);
    if (path[2] !== "goals")
      return NextResponse.json(
        { error: "Endpoint not found" },
        { status: 404 },
      );
    const userId = user(request);
    throttle(userId);
    const goals = goalsSchema.parse(await request.json());
    await mutateDatabase((db) => {
      db.goals[userId] = goals;
    });
    return NextResponse.json(goals);
  } catch (error) {
    return errorResponse(error);
  }
}
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    const { path } = await params;
    checkEvent(path);
    let userId = user(request);
    throttle(userId);
    const body = await request.json().catch(() => ({}));
    let runId: string | undefined;
    if (path.join("/") === "demo/action") {
      const action = actionSchema.parse(body);
      switch (action.action) {
        case "start-run":
          runId = await startRun(
            userId,
            request.headers.get("Idempotency-Key") || undefined,
          );
          break;
        case "request-intro":
          await requestIntroduction(userId, z.string().parse(action.matchId));
          break;
        case "decline-match":
          await mutateDatabase((db) => {
            const match = db.matches.find(
              (item) =>
                item.id === action.matchId && item.ownerUserId === userId,
            );
            if (!match) throw new Error("Match not found");
            if (["accepted", "requested"].includes(match.status))
              throw new Error(
                "Respond to the existing meeting request instead",
              );
            match.status = "declined";
          });
          break;
        case "switch-user":
          userId = z.string().parse(action.userId);
          if (
            userId !== "usr_self" &&
            !attendees.some((person) => person.id === userId)
          )
            throw new Error("Unknown demo account");
          break;
        case "respond-meeting":
          await respondToMeeting(
            userId,
            z.string().parse(action.meetingId),
            z.boolean().parse(action.accept),
          );
          break;
        case "complete-meeting":
          await complete(userId, z.string().parse(action.meetingId));
          break;
        case "feedback":
          await complete(userId, z.string().parse(action.meetingId), {
            relevance: z.number().int().min(1).max(5).parse(action.relevance),
            note: action.note || "",
          });
          break;
        case "reset":
          await resetDatabase();
          userId = "usr_self";
          break;
      }
      const response = NextResponse.json({
        ...(await getState(userId)),
        ...(runId ? { runId } : {}),
      });
      response.cookies.set("demo_user", userId, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 86400,
      });
      return response;
    }
    if (path[2] === "twin-runs") {
      runId = await startRun(
        userId,
        request.headers.get("Idempotency-Key") || undefined,
      );
      return NextResponse.json(
        {
          run_id: runId,
          status: "running",
          counts: { discovered: 0, conversations: 0 },
        },
        { status: 202 },
      );
    }
    if (path[2] === "matches" && path[4] === "request")
      return NextResponse.json(await requestIntroduction(userId, path[3]));
    if (path[2] === "meetings" && path[4] === "respond")
      return NextResponse.json(
        await respondToMeeting(
          userId,
          path[3],
          z.object({ accept: z.boolean() }).parse(body).accept,
        ),
      );
    if (path[2] === "meetings" && path[4] === "feedback") {
      const feedback = z
        .object({
          relevance: z.number().int().min(1).max(5),
          note: z.string().max(3000).default(""),
        })
        .parse(body);
      return NextResponse.json(await complete(userId, path[3], feedback));
    }
    return NextResponse.json({ error: "Endpoint not found" }, { status: 404 });
  } catch (error) {
    return errorResponse(error);
  }
}
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    const { path } = await params;
    if (path.join("/") !== "me/twin")
      return NextResponse.json(
        { error: "Endpoint not found" },
        { status: 404 },
      );
    const userId = user(request);
    await mutateDatabase((db) => {
      db.profiles[userId] = {
        ...structuredClone(defaultProfile),
        id: userId,
        name: "Your name",
        role: "",
        company: "",
        bio: "",
        expertise: [],
        offers: "",
        seeks: "",
        topicsToAvoid: "",
        permissions: {
          bio: false,
          expertise: false,
          offers: false,
          seeks: false,
          topics: false,
          company: false,
        },
        version: 1,
      };
      db.goals[userId] = {
        text: "Set your conference goal",
        categories: [],
        industry: "",
        stage: "",
        outcome: "",
      };
      db.runs = db.runs.filter((run) => run.ownerUserId !== userId);
      db.matches = db.matches.filter((match) => match.ownerUserId !== userId);
      db.meetings = db.meetings.filter(
        (meeting) =>
          meeting.ownerUserId !== userId && meeting.candidateId !== userId,
      );
      if (db.fieldnotes) {
        const remainingMeetings = new Set(db.meetings.map(meeting => meeting.id));
        for (const key of Object.keys(db.fieldnotes)) {
          const [meetingId, ownerId] = JSON.parse(key) as string[];
          if (ownerId === userId || !remainingMeetings.has(meetingId)) delete db.fieldnotes[key];
        }
      }
      db.integrationEvents = db.integrationEvents.filter(
        (event) => event.user_id !== userId,
      );
    });
    return NextResponse.json({ deleted: true });
  } catch (error) {
    return errorResponse(error);
  }
}
