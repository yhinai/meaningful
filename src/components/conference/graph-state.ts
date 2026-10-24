import type { DemoState, Meeting, RunEvent } from "@/lib/types";
import { personFor } from "@/components/connections/model";
import { type GraphPerson, withPortrait } from "@/components/network/people";

export type ConferenceCircle = {
  people: GraphPerson[];
  community: GraphPerson[];
  active: string[];
  qualified: string[];
  accepted: string[];
  completed: string[];
  rejected: string[];
};

function eventCandidate(event: RunEvent, state: DemoState) {
  if (typeof event.payload.candidate_id === "string")
    return event.payload.candidate_id;
  const meeting = state.meetings.find(
    (item) => item.id === event.payload.meeting_id,
  );
  return meeting
    ? meeting.ownerUserId === state.activeUserId
      ? meeting.candidateId
      : meeting.ownerUserId
    : "";
}

/** Replays actual run events; current human approvals only join the latest live view. */
export function deriveConferenceCircle(
  state: DemoState | null,
  events: RunEvent[] = [],
  includeCurrentMeetings = true,
): ConferenceCircle {
  if (!state)
    return {
      people: [],
      community: [],
      active: [],
      qualified: [],
      accepted: [],
      completed: [],
      rejected: [],
    };
  const run = state.runs
    .filter((item) => item.ownerUserId === state.activeUserId)
    .at(-1);
  const active = new Set<string>();
  const qualified = new Set<string>();
  const accepted = new Set<string>();
  const completed = new Set<string>();
  const rejected = new Set<string>();
  const discovered = new Set<string>();
  const previousRuns = state.runs.filter(
    (item) => item.ownerUserId === state.activeUserId && item.id !== run?.id,
  );
  const history = includeCurrentMeetings
    ? previousRuns.flatMap((item) => item.events)
    : [];
  for (const event of [...history, ...events]) {
    const id = eventCandidate(event, state);
    if (!id) continue;
    if (event.type === "candidate.discovered") discovered.add(id);
    if (event.type === "negotiation.started") active.add(id);
    if (event.type === "negotiation.completed" || event.type === "match.scored")
      active.delete(id);
    if (event.type === "match.qualified") qualified.add(id);
    if (event.type === "match.rejected") rejected.add(id);
    if (event.type === "meeting.accepted") accepted.add(id);
    if (event.type === "meeting.completed") completed.add(id);
    if (event.type === "meeting.declined") {
      accepted.delete(id);
      completed.delete(id);
    }
  }
  if (includeCurrentMeetings) {
    for (const id of active)
      if (
        !events.some(
          (event) =>
            event.type === "negotiation.started" &&
            eventCandidate(event, state) === id,
        )
      )
        active.delete(id);
    if (run?.status !== "running") active.clear();
    const relationships = new Map<string, Meeting>();
    const priority = {
      accepted: 4,
      completed: 3,
      awaiting_approval: 2,
      declined: 0,
    };
    for (const meeting of state.meetings) {
      const id =
        meeting.ownerUserId === state.activeUserId
          ? meeting.candidateId
          : meeting.ownerUserId;
      const previous = relationships.get(id);
      if (!previous || priority[meeting.status] >= priority[previous.status])
        relationships.set(id, meeting);
    }
    for (const [id, meeting] of relationships) {
      accepted.delete(id);
      completed.delete(id);
      if (
        meeting.status === "accepted" &&
        meeting.requesterAccepted &&
        meeting.recipientAccepted
      ) {
        accepted.add(id);
        discovered.add(id);
        rejected.delete(id);
      }
      if (
        meeting.status === "completed" &&
        meeting.requesterAccepted &&
        meeting.recipientAccepted
      ) {
        completed.add(id);
        discovered.add(id);
        rejected.delete(id);
      }
      if (meeting.status === "declined") {
        qualified.delete(id);
        rejected.add(id);
      }
    }
  }
  const candidates = state.candidates.filter(
    (person) => person.id !== state.activeUserId,
  );
  for (const id of discovered)
    if (
      id !== state.activeUserId &&
      !candidates.some((person) => person.id === id)
    )
      candidates.push(personFor(state, id));
  const community = candidates.map((person, index) =>
    person.id === "usr_self"
      ? { ...person, avatar: "" }
      : withPortrait(person, index),
  );
  const ordered = run
    ? [...discovered]
        .map((id) => candidates.find((person) => person.id === id))
        .filter((person): person is (typeof candidates)[number] =>
          Boolean(person),
        )
    : candidates;
  const people = ordered.map((person, index) =>
    person.id === "usr_self"
      ? { ...person, avatar: "" }
      : withPortrait(person, index),
  );
  return {
    people,
    community,
    active: [...active],
    qualified: [...qualified],
    accepted: [...accepted],
    completed: [...completed],
    rejected: [...rejected],
  };
}
