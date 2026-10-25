import { z } from "zod";

export const segmentSchema = z
  .object({
    id: z.string().min(1).max(160),
    text: z.string().trim().min(1).max(4000),
  })
  .strict();
export const insightSchema = z
  .object({
    id: z.string().min(1).max(100),
    kind: z.enum(["person", "topic", "highlight", "idea", "follow_up"]),
    title: z.string().trim().min(1).max(140),
    description: z.string().trim().min(1).max(1600),
    evidenceSegmentIds: z.array(z.string()).min(1).max(20),
    quote: z.string().max(4000),
    confidence: z.enum(["explicit", "inferred"]),
  })
  .strict();
export type Segment = z.infer<typeof segmentSchema>;
export type Insight = z.infer<typeof insightSchema>;
export const reviewedSchema = z
  .object({
    source: z.enum(["synthetic", "omi-import"]),
    segments: z.array(segmentSchema).min(1).max(80),
    analysisConsent: z.literal(true),
  })
  .strict();
export const editionInputSchema = reviewedSchema.extend({
  insights: z.array(insightSchema).min(1).max(30),
  approval: z.literal(true),
});
export type Edition = z.infer<typeof editionInputSchema> & {
  id: string;
  createdAt: string;
  graphStatus: "synced" | "failed" | "not-configured";
};
export const fixtureText =
  "We discussed knowledge graphs and how evidence makes AI answers easier to trust.\nI want to explore a personal conference magazine that links every highlight to its source.\nA possible next step is to prototype the idea. This is a suggestion, not an agreed commitment.";

// Omi JSONL contains partial events: only finalized transcript records are imported.
export function parseTranscript(text: string): Segment[] {
  if (text.length > 60_000) throw Error("Import must be smaller than 60 KB.");
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  const segments = lines.flatMap((line, index) => {
    if (line.trim().startsWith("{")) {
      let event;
      try {
        event = JSON.parse(line);
      } catch {
        throw Error(`Invalid JSON on line ${index + 1}.`);
      }
      if (event.type !== "transcript" && event.type !== "final") return [];
      if (typeof event.text !== "string")
        throw Error("Final transcript record is missing text.");
      return [
        {
          id: String(event.event_id ?? `segment-${index + 1}`),
          text: event.text,
        },
      ];
    }
    return [
      { id: `segment-${index + 1}`, text: line.replace(/^\[[^\]]+\]\s*/, "") },
    ];
  });
  return validateSegments(segments);
}
export function validateSegments(input: unknown): Segment[] {
  const segments = z.array(segmentSchema).min(1).max(80).parse(input);
  if (new Set(segments.map((s) => s.id)).size !== segments.length)
    throw Error("Segment IDs must be unique.");
  if (segments.reduce((n, s) => n + s.text.length, 0) > 60_000)
    throw Error("Reviewed transcript exceeds 60 KB.");
  return segments;
}
export function validateInsights(
  input: unknown,
  segments: Segment[],
): Insight[] {
  const insights = z.array(insightSchema).min(1).max(30).parse(input);
  const evidence = new Map(segments.map((s) => [s.id, s.text]));
  if (new Set(insights.map((i) => i.id)).size !== insights.length)
    throw Error("Insight IDs must be unique.");
  for (const insight of insights) {
    if (insight.evidenceSegmentIds.some((id) => !evidence.has(id)))
      throw Error("Insight refers to an unknown source segment.");
    if (
      insight.quote &&
      !insight.evidenceSegmentIds.some((id) =>
        evidence.get(id)!.includes(insight.quote),
      )
    )
      throw Error("Quoted words must match a cited source exactly.");
  }
  return insights;
}
export function demoInsights(segments: Segment[]): Insight[] {
  return segments.slice(0, 3).map((s, index) => ({
    id: `demo-${index + 1}`,
    kind: index === 2 ? "follow_up" : "highlight",
    title: [
      "Evidence worth keeping",
      "An idea to explore",
      "A possible next step",
    ][index],
    description: s.text,
    evidenceSegmentIds: [s.id],
    quote: s.text,
    confidence: "explicit",
  }));
}
