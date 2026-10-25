import { config } from "dotenv";
import assert from "node:assert/strict";
import { FalkorDB } from "falkordb";
import { connectionOptions } from "./falkordb-connection.mjs";
import { fileURLToPath } from "node:url";
config({
  path: fileURLToPath(new URL("../.env", import.meta.url)),
  quiet: true,
});
const base = process.env.OMI_LAB_TEST_URL ?? "http://127.0.0.1:3007";
if (!["127.0.0.1", "localhost", "[::1]"].includes(new URL(base).hostname))
  throw Error("Live verifier only sends the operator token to localhost.");
let id, db;
async function call(action, input, editionId) {
  const response = await fetch(`${base}/api/omi-lab`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OMI_LAB_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ action, input, id: editionId }),
    signal: AbortSignal.timeout(30_000),
  });
  const data = await response.json();
  assert.equal(response.status, 200, JSON.stringify(data));
  return data;
}
try {
  assert.equal((await fetch(`${base}/api/omi-lab`)).status, 401);
  assert.equal((await call("check")).falkordb, "LIVE PASSED");
  console.log("PASS private API and live TLS connection");
  const segments = [
    {
      id: "e2e-approved",
      text: "This fictional test explores evidence-linked knowledge graphs.",
    },
    { id: "e2e-excluded", text: "Excluded synthetic segment." },
  ];
  const analysis = await call("analyze", {
    source: "synthetic",
    segments,
    analysisConsent: true,
  });
  const { edition } = await call("generate", {
    source: "synthetic",
    segments,
    analysisConsent: true,
    approval: true,
    insights: [analysis.insights[0]],
  });
  id = edition.id;
  assert.equal(edition.graphStatus, "synced");
  assert.equal(edition.segments.length, 1);
  await call("sync", undefined, id);
  const paths = await call("paths", undefined, id);
  assert.equal(paths.paths.length, 1);
  assert.ok(paths.paths[0].p);
  db = await FalkorDB.connect(await connectionOptions());
  db.on("error", () => {});
  const graph = db.selectGraph("conference");
  const count = async () => {
    const reply = await graph.roQuery(
      "MATCH (n {scope:$scope}) WHERE n.editionId=$id OR (n:Magazine AND n.id=$id) RETURN count(n) AS count",
      { params: { scope: "meaningfulmeet-private-omi-v1", id } },
    );
    return reply.data[0].count;
  };
  assert.equal(await count(), 3);
  console.log(
    "PASS approved edition, idempotent graph sync, actual returned path; excluded evidence absent",
  );
  await call("delete", undefined, id);
  assert.equal(await count(), 0);
  id = undefined;
  console.log("PASS local and remote deletion verified");
} catch (error) {
  console.error(
    error instanceof assert.AssertionError
      ? error.message
      : "FAIL live verification (credentials and client details omitted)",
  );
  process.exitCode = 1;
} finally {
  if (db) await db.close();
  if (id) {
    try {
      await call("delete", undefined, id);
    } catch {
      console.error(`Cleanup pending for synthetic test edition ${id}`);
    }
  }
}
