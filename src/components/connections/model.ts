import type { DemoState, Match, Meeting, Person } from "@/lib/types";
import { defaultProfile } from "@/lib/fixtures";

export type Connection = {
  person: Person;
  match?: Match;
  meeting?: Meeting;
  status: "new" | "waiting" | "incoming" | "ready" | "met";
};

export function personFor(state: DemoState, id: string): Person {
  const person = state.candidates.find((candidate) => candidate.id === id);
  if (person) return person;
  return {
    ...defaultProfile,
    id,
    topics: defaultProfile.expertise.slice(0, 2),
    avatar: "AM",
    color: "#e9e8e2",
    score: 0,
    optIn: true,
    eventId: "evt_demo",
    availability: true,
  };
}

/** Existing meeting consent outranks provisional match cards, across repeated runs. */
export function deriveConnections(state: DemoState): Connection[] {
  const matches = new Map<string, Match>();
  state.matches.forEach((match) => matches.set(match.candidateId, match));
  const meetings = new Map<string, Meeting>();
  const priority = {
    accepted: 4,
    completed: 3,
    awaiting_approval: 2,
    declined: 0,
  };
  state.meetings.forEach((meeting) => {
    if (meeting.status === "declined") return;
    const otherId =
      meeting.ownerUserId === state.activeUserId
        ? meeting.candidateId
        : meeting.ownerUserId;
    const previous = meetings.get(otherId);
    if (!previous || priority[meeting.status] >= priority[previous.status])
      meetings.set(otherId, meeting);
  });
  const ids = new Set([...matches.keys(), ...meetings.keys()]);
  const declinedIds = new Set(
    state.meetings
      .filter((meeting) => meeting.status === "declined")
      .map((meeting) =>
        meeting.ownerUserId === state.activeUserId
          ? meeting.candidateId
          : meeting.ownerUserId,
      ),
  );
  const result: Connection[] = [];
  ids.forEach((id) => {
    const meeting = meetings.get(id);
    const match = matches.get(id);
    if (!meeting && declinedIds.has(id)) return;
    if (
      !meeting &&
      (!match ||
        match.status === "declined" ||
        match.status === "requested" ||
        match.status === "accepted")
    )
      return;
    const status =
      meeting?.status === "accepted"
        ? "ready"
        : meeting?.status === "completed"
          ? "met"
          : meeting
            ? meeting.candidateId === state.activeUserId
              ? "incoming"
              : "waiting"
            : "new";
    result.push({ person: personFor(state, id), match, meeting, status });
  });
  const order = { incoming: 0, ready: 1, new: 2, waiting: 3, met: 4 };
  return result.sort(
    (a, b) =>
      order[a.status] - order[b.status] ||
      (b.match?.score ?? 0) - (a.match?.score ?? 0),
  );
}

/** Compact card copy; detailed scoring evidence remains in the person overlay. */
export function connectionSummary(connection: Connection): string {
  const topic = connection.person.topics[0] ?? connection.person.expertise[0];
  return topic
    ? `Shared interest in ${topic.replace(/[.\s]+$/, "")}.`
    : "A shared curiosity. A little common ground.";
}
