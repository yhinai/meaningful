import type { Database } from "@/lib/types";
import { getDatabase, mutateDatabase } from "@/lib/store";
import { LocationError } from "@/features/find-twin/server/location-error";
import {
  draftSchema,
  emptyFieldnotes,
  parseTranscript,
  validateEdition,
  type Fieldnotes,
  type Edition,
  type Passage,
} from "./model";
import { generateEdition } from "./generate";

export const journalKey = (meetingId: string, viewer: string) =>
  JSON.stringify([meetingId, viewer]);
export function requireMeeting(
  db: Database,
  eventId: string,
  meetingId: string,
  viewer: string,
) {
  const meeting = db.meetings.find(
    (item) =>
      item.id === meetingId &&
      item.eventId === eventId &&
      [item.ownerUserId, item.candidateId].includes(viewer),
  );
  if (!meeting)
    throw new LocationError(
      "This meeting is not available to this account.",
      404,
    );
  if (
    !["accepted", "completed"].includes(meeting.status) ||
    !meeting.requesterAccepted ||
    !meeting.recipientAccepted
  )
    throw new LocationError(
      "Both people must accept the introduction first.",
      403,
    );
  return meeting;
}
export async function readJournal(
  eventId: string,
  meetingId: string,
  viewer: string,
) {
  const db = await getDatabase();
  const meeting = requireMeeting(db, eventId, meetingId, viewer);
  return {
    meeting,
    journal:
      db.fieldnotes?.[journalKey(meetingId, viewer)] ?? emptyFieldnotes(),
  };
}
export async function saveJournal(
  eventId: string,
  meetingId: string,
  viewer: string,
  input: unknown,
) {
  const draft = draftSchema.parse(input);
  const parsed = parseTranscript(draft.transcript);
  return mutateDatabase((db) => {
    requireMeeting(db, eventId, meetingId, viewer);
    const key = journalKey(meetingId, viewer);
    const prior = db.fieldnotes?.[key] ?? emptyFieldnotes();
    if (prior.revision !== draft.revision)
      throw new LocationError(
        "Your journal changed in another window. Reload before saving.",
        409,
      );
    const changed = prior.transcript !== draft.transcript;
    const next: Fieldnotes = {
      ...draft,
      ...parsed,
      revision: prior.revision + 1,
      updatedAt: new Date().toISOString(),
      ...(!changed && prior.edition
        ? {
            edition: prior.edition,
            generatedAt: prior.generatedAt,
            visuals: prior.visuals,
          }
        : {}),
      completedFollowups: changed
        ? []
        : [...new Set(draft.completedFollowups)].filter(
            (index) => index < (prior.edition?.followups.length ?? 0),
          ),
    };
    (db.fieldnotes ??= {})[key] = next;
    return next;
  });
}
const pending = new Set<string>();
export async function buildJournal(
  eventId: string,
  meetingId: string,
  viewer: string,
  revision: number,
  generate: (
    sources: Passage[],
    gaps: number,
  ) => Promise<Edition> = generateEdition,
) {
  const key = journalKey(meetingId, viewer);
  if (pending.has(key))
    throw new LocationError("Your edition is already being prepared.", 409);
  pending.add(key);
  try {
    const { meeting, journal } = await readJournal(eventId, meetingId, viewer);
    if (meeting.status !== "completed")
      throw new LocationError(
        "Complete the meeting before making your after-meeting edition.",
        409,
      );
    if (journal.revision !== revision)
      throw new LocationError(
        "Your journal changed. Reload before generating.",
        409,
      );
    if (!journal.sources.length)
      throw new LocationError(
        "Add a finalized transcript before making an edition.",
      );
    const edition = validateEdition(
      await generate(journal.sources, journal.gapCount),
      journal.sources,
    );
    return await mutateDatabase((db) => {
      const currentMeeting = requireMeeting(db, eventId, meetingId, viewer);
      const current = db.fieldnotes?.[key];
      if (
        !current ||
        current.revision !== revision ||
        currentMeeting.status !== "completed"
      )
        throw new LocationError(
          "Your journal changed while the edition was being prepared. Generate again from the saved transcript.",
          409,
        );
      const next = {
        ...current,
        edition,
        revision: current.revision + 1,
        generatedAt: new Date().toISOString(),
        completedFollowups: [],
      };
      db.fieldnotes![key] = next;
      return next;
    });
  } finally {
    pending.delete(key);
  }
}
