import { falkorDBConfigured, normalizeGraphPaths } from "@/features/falkordb/server";
import { conferencePathProof, graphCounts } from "@/features/falkordb/seed";
import type { FalkorSponsorStatus } from "@/features/falkordb/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
let cached: { until: number; value: FalkorSponsorStatus } | undefined;
let pending: Promise<FalkorSponsorStatus> | undefined;

async function check(): Promise<FalkorSponsorStatus> {
  try {
    // Read-only proof. Never seed or expose connection details on a page visit.
    const [counts, rows] = await Promise.all([graphCounts(), conferencePathProof()]);
    const paths = normalizeGraphPaths(rows);
    return { status: paths.length ? "passed" : "unavailable", graph: "conference",
      checkedAt: new Date().toISOString(), counts, paths };
  } catch {
    return { status: "unavailable", graph: "conference", checkedAt: new Date().toISOString() };
  }
}

export async function GET() {
  const headers = { "Cache-Control": "no-store" };
  if (!falkorDBConfigured()) return Response.json({ status: "not_configured", graph: "conference",
    checkedAt: new Date().toISOString() } satisfies FalkorSponsorStatus, { headers });
  if (cached && cached.until > Date.now()) return Response.json(cached.value, { headers });
  pending ??= check().then(value => {
    cached = { value, until: Date.now() + (value.status === "passed" ? 60000 : 10000) };
    return value;
  }).finally(() => { pending = undefined; });
  return Response.json(await pending, { headers });
}
