import type { TwinRun } from "@/lib/types";

/** Activity comes only from persisted workflow events, including after reconnects. */
export function scoutActivity(run?: TwinRun) {
  const discovered = new Set<string>();
  const finished = new Set<string>();
  let activeId: string | undefined;
  for (const event of run?.events ?? []) {
    const id = typeof event.payload.candidate_id === "string" ? event.payload.candidate_id : undefined;
    if (!id) continue;
    if (event.type === "candidate.discovered") discovered.add(id);
    if (event.type === "negotiation.started") activeId = id;
    if (event.type === "negotiation.completed") {
      finished.add(id);
      if (activeId === id) activeId = undefined;
    }
  }
  const target = Math.min(run?.rankings.length ?? 0, run?.batchSize ?? 3);
  const completed = run?.status === "completed";
  const failed = run?.status === "failed";
  if (completed || failed) activeId = undefined;
  const progress = completed ? 100 : target ? Math.min(99,
    Math.round(((Math.min(discovered.size, target) + (run?.messages.length ?? 0) + finished.size) / (target * 8)) * 100)) : 0;
  return { discovered, finished, activeId, target, completed, failed, progress };
}
