import { z } from "zod";

const text = (max: number) => z.string().trim().min(1).max(max);
const refs = z.array(text(160)).min(1).max(12);
export const editionSchema = z.object({
  title: text(140),
  standfirst: text(700),
  sections: z
    .array(
      z.object({ title: text(160), summary: text(3000), source_ids: refs }),
    )
    .min(1)
    .max(5),
  takeaways: z
    .array(z.object({ text: text(700), source_ids: refs }))
    .min(1)
    .max(6),
  followups: z
    .array(
      z.object({
        text: text(700),
        source_ids: refs,
        kind: z.enum(["commitment", "suggestion"]),
      }),
    )
    .max(6),
});
export type Edition = z.infer<typeof editionSchema>;
export type Passage = { id: string; text: string; timestamp?: string };
export type Fieldnotes = {
  revision: number;
  note: string;
  transcript: string;
  sources: Passage[];
  gapCount: number;
  edition?: Edition;
  generatedAt?: string;
  updatedAt?: string;
  completedFollowups: number[];
};
export const emptyFieldnotes = (): Fieldnotes => ({
  revision: 0,
  note: "",
  transcript: "",
  sources: [],
  gapCount: 0,
  completedFollowups: [],
});
export const draftSchema = z
  .object({
    revision: z.number().int().min(0),
    note: z.string().max(6000),
    transcript: z.string().max(60000),
    completedFollowups: z.array(z.number().int().min(0).max(5)).max(6),
  })
  .strict();

/** Omi JSONL exports keep final passages and visible gaps; partial captions never become evidence. */
export function parseTranscript(input: string): {
  sources: Passage[];
  gapCount: number;
} {
  if (!input.trim()) return { sources: [], gapCount: 0 };
  const sources: Passage[] = [];
  const seen = new Set<string>();
  let gapCount = 0;
  const jsonl = /^\{|^\[\s*(?:\{|\]|"|\d+\s*[,\]])/.test(input.trim());
  const add = (id: string, body: string, timestamp?: string) => {
    if (!body.trim() || seen.has(id)) return;
    if (id.length > 160 || body.length > 12000 || sources.length >= 200)
      throw Error(
        "Use at most 200 passages, with up to 12,000 characters each.",
      );
    seen.add(id);
    sources.push({
      id,
      text: body.trim(),
      ...(timestamp ? { timestamp: timestamp.slice(0, 100) } : {}),
    });
  };
  if (jsonl) {
    let records: unknown[];
    try {
      records = input.trim().startsWith("[")
        ? JSON.parse(input)
        : input
            .split(/\r?\n/)
            .filter((line) => line.trim())
            .map((line) => JSON.parse(line));
    } catch {
      throw Error(
        "The Omi export contains invalid JSON. Import JSONL, a JSON array, or plain transcript text.",
      );
    }
    for (const [index, value] of records.entries()) {
      if (!value || typeof value !== "object" || Array.isArray(value))
        throw Error("Each Omi record must be an object.");
      const event = value as Record<string, unknown>;
      if (event.type === "gap") {
        gapCount++;
        continue;
      }
      if (
        event.is_final === false ||
        (event.type && event.type !== "transcript")
      )
        continue;
      if (typeof event.text !== "string")
        throw Error("A transcript passage is missing its text.");
      const identity = event.event_id ?? event.id ?? `passage-${index + 1}`;
      if (typeof identity !== "string" || !identity.trim())
        throw Error("Passage IDs must be nonempty strings.");
      add(
        identity,
        event.text,
        typeof event.timestamp === "string" ? event.timestamp : undefined,
      );
    }
  } else {
    input
      .trim()
      .split(/\n\s*\n/)
      .forEach((paragraph, index) => add(`passage-${index + 1}`, paragraph));
  }
  if (!sources.length)
    throw Error(
      "No finalized transcript passages were found. Partial captions and recording gaps cannot make an edition.",
    );
  return { sources, gapCount };
}

export function validateEdition(value: unknown, sources: Passage[]): Edition {
  const edition = editionSchema.parse(value);
  const valid = new Set(sources.map((source) => source.id));
  for (const item of [
    ...edition.sections,
    ...edition.takeaways,
    ...edition.followups,
  ]) {
    if (item.source_ids.some((id) => !valid.has(id)))
      throw Error(
        "The editor cited an unknown passage. Your saved edition was preserved.",
      );
  }
  return edition;
}
