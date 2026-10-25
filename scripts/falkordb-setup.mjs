import { config } from "dotenv";
import { FalkorDB } from "falkordb";
import { connectionOptions } from "./falkordb-connection.mjs";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

config({
  path: fileURLToPath(new URL("../.env", import.meta.url)),
  quiet: true,
});
const url = process.env.FALKORDB_URL;
const sample = "meaningfulmeet-conference-demo-v1";
export const pathQuery = `MATCH p=(a:Attendee)-[:MET]->(s:Speaker)-[:PRESENTS]->(t:Talk)-[:ABOUT]->(topic:Topic)
WHERE a.sample = $sample AND (a)-[:INTERESTED_IN]->(topic)
RETURN p, a.name AS attendee, s.name AS speaker, t.title AS talk, topic.name AS topic`;

let db;
let stage = "Connection";
const deadline = setTimeout(() => {
  console.error(`FAIL ${stage}: verification exceeded 45 seconds`);
  process.exit(1);
}, 45_000);
try {
  assert.ok(url, "FALKORDB_URL must be configured in .env");
  assert.equal(new URL(url).protocol, "falkors:", "TLS URL required");
  db = await FalkorDB.connect(await connectionOptions());
  db.on("error", () =>
    console.error("FalkorDB connection error (credentials omitted)"),
  );
  const graph = db.selectGraph("conference");
  const connection = await graph.roQuery("RETURN 1 AS ok");
  assert.equal(connection.data[0].ok, 1);
  console.log("PASS Connection: TLS connection; RETURN 1 = 1");
  stage = "Data";
  // Fictional sample only. Names are not claims about real attendees or events.
  const seed = `MERGE (a:Attendee {sample:$sample, key:'attendee'}) SET a.name='Demo attendee', a.synthetic=true
MERGE (b:Attendee {sample:$sample, key:'peer'}) SET b.name='Demo peer', b.synthetic=true
MERGE (s:Speaker {sample:$sample, key:'speaker'}) SET s.name='Demo speaker', s.synthetic=true
MERGE (t:Talk {sample:$sample, key:'talk'}) SET t.title='Grounded conference memories', t.synthetic=true
MERGE (topic:Topic {sample:$sample, key:'topic'}) SET topic.name='Knowledge graphs', topic.synthetic=true
MERGE (r:Room {sample:$sample, key:'room'}) SET r.name='Demo room', r.synthetic=true
MERGE (s)-[:PRESENTS]->(t)
MERGE (t)-[:ABOUT]->(topic)
MERGE (t)-[:IN_ROOM]->(r)
MERGE (a)-[:INTERESTED_IN]->(topic)
MERGE (a)-[:MET]->(s)
MERGE (a)-[:MET]->(b)`;
  await graph.query(seed, { params: { sample } });
  const nodeCounts = await graph.roQuery(
    "MATCH (n) RETURN labels(n) AS labels, count(n) AS count",
  );
  const edgeCounts = await graph.roQuery(
    "MATCH ()-[r]->() RETURN type(r) AS type, count(r) AS count",
  );
  const counts = async () => {
    const nodes = await graph.roQuery(
      "MATCH (n {sample:$sample}) RETURN count(n) AS count",
      { params: { sample } },
    );
    const edges = await graph.roQuery(
      "MATCH (a {sample:$sample})-[r]->(b {sample:$sample}) RETURN count(r) AS count",
      { params: { sample } },
    );
    return [nodes.data[0].count, edges.data[0].count];
  };
  assert.deepEqual(await counts(), [6, 6]);
  // Verify rerunning setup does not duplicate the fixture.
  await graph.query(seed, { params: { sample } });
  assert.deepEqual(await counts(), [6, 6]);
  for (const label of ["Talk", "Speaker", "Topic", "Room", "Attendee"]) {
    assert.ok(
      nodeCounts.data.some(
        (row) => row.labels.includes(label) && row.count > 0,
      ),
    );
  }
  for (const type of ["PRESENTS", "ABOUT", "IN_ROOM", "INTERESTED_IN", "MET"]) {
    assert.ok(
      edgeCounts.data.some((row) => row.type === type && row.count > 0),
    );
  }
  console.log("PASS Data: sample 6 nodes, 6 edges; rerun is idempotent");
  console.log("Graph node counts:", JSON.stringify(nodeCounts.data));
  console.log("Graph edge counts:", JSON.stringify(edgeCounts.data));
  stage = "Path query";
  const paths = await graph.roQuery(pathQuery, { params: { sample } });
  assert.ok(
    paths.data.length > 0 && paths.data[0].p,
    "Expected a returned multi-hop path",
  );
  console.log(`PASS Path query: ${paths.data.length} path(s)`);
  for (const row of paths.data) {
    console.log(
      `${row.attendee} --MET--> ${row.speaker} --PRESENTS--> ${row.talk} --ABOUT--> ${row.topic}`,
    );
    console.log(
      `Interest evidence: ${row.attendee} --INTERESTED_IN--> ${row.topic}`,
    );
  }
} catch (error) {
  // Never print client errors verbatim: a connection error may contain credentials.
  console.error(
    `FAIL ${stage}: ${error instanceof assert.AssertionError ? error.message : "check credentials, network and server availability (details omitted)"}`,
  );
  process.exitCode = 1;
} finally {
  clearTimeout(deadline);
  if (db) await db.close();
}
