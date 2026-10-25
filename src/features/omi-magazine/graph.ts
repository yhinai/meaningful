import { FalkorDB } from "falkordb";
import { connectionOptions } from "../../../scripts/falkordb-connection.mjs";
import type { Edition } from "./model";

export const graphScope = "meaningfulmeet-private-omi-v1";
export async function withGraph<T>(
  action: (graph: ReturnType<FalkorDB["selectGraph"]>) => Promise<T>,
): Promise<T> {
  const url = process.env.FALKORDB_URL;
  if (!url) throw Error("FalkorDB is not configured.");
  if (new URL(url).protocol !== "falkors:")
    throw Error("FalkorDB requires a TLS connection URL.");
  const db = await FalkorDB.connect(await connectionOptions());
  db.on("error", () => {}); // Callers expose sanitized status; never log credentials.
  try {
    return await action(db.selectGraph("conference"));
  } finally {
    await db.close();
  }
}
export const editionQuery = `MERGE (m:Magazine {scope:$scope, id:$id})
SET m.createdAt=$createdAt, m.synthetic=$synthetic
WITH m UNWIND $insights AS item
MERGE (i:MemoryInsight {scope:$scope, editionId:$id, id:item.id})
SET i.title=item.title, i.description=item.description, i.kind=item.kind, i.confidence=item.confidence
MERGE (m)-[:HAS_INSIGHT]->(i)
WITH i, item UNWIND item.evidence AS evidence
MERGE (s:TranscriptSegment {scope:$scope, editionId:$id, id:evidence.id}) SET s.text=evidence.text
MERGE (i)-[:SUPPORTED_BY]->(s)`;
export async function syncEdition(edition: Edition) {
  const segments = new Map(
    edition.segments.map((segment) => [segment.id, segment]),
  );
  await withGraph((graph) =>
    graph.query(editionQuery, {
      TIMEOUT: 5000,
      params: {
        scope: graphScope,
        id: edition.id,
        createdAt: edition.createdAt,
        synthetic: edition.source === "synthetic",
        insights: edition.insights.map((item) => ({
          ...item,
          evidence: item.evidenceSegmentIds.map((id) => segments.get(id)!),
        })),
      },
    }),
  );
}
export async function readPaths(id: string) {
  return withGraph(async (graph) => {
    const result = await graph.roQuery<{
      insight: string;
      segment: string;
      quote: string;
    }>(
      `MATCH p=(m:Magazine {scope:$scope,id:$id})-[:HAS_INSIGHT]->(i:MemoryInsight)-[:SUPPORTED_BY]->(s:TranscriptSegment) RETURN p, i.title AS insight, s.id AS segment, s.text AS quote ORDER BY insight LIMIT 80`,
      { TIMEOUT: 5000, params: { scope: graphScope, id } },
    );
    return (result.data ?? []).map((row) => ({
      ...row,
      path: `Magazine → ${row.insight} → ${row.segment}`,
    }));
  });
}
export async function deleteGraphEdition(id: string) {
  await withGraph((graph) =>
    graph.query(
      `MATCH (n {scope:$scope}) WHERE n.editionId=$id OR (n:Magazine AND n.id=$id) DETACH DELETE n`,
      { TIMEOUT: 5000, params: { scope: graphScope, id } },
    ),
  );
}
