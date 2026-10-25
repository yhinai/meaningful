import { promises as fs } from "node:fs";
import { closeFalkorDB, conferenceGraph, safeFalkorError } from "../src/features/falkordb/server";
import { seedConferenceGraph, graphCounts, conferencePathProof } from "../src/features/falkordb/seed";
import { BROWSER_PATH_QUERY } from "../src/features/falkordb/queries";

async function main() {
  const graph=await conferenceGraph();
  const connection=await graph.roQuery<{connection:number}>("RETURN 1 AS connection",{TIMEOUT:5000});
  if(connection.data?.[0]?.connection!==1)throw Error("Simple connection query did not return 1.");
  console.log("PASS Connection: FALKORDB_URL from .env; verified TLS; RETURN 1 = 1");
  await seedConferenceGraph();
  const counts=await graphCounts();
  if(!counts.nodes || !counts.edges)throw Error("The conference graph has no data.");
  console.log(`PASS Data: conference has ${counts.nodes} nodes and ${counts.edges} edges (${counts.namespaceNodes} namespaced synthetic nodes)`);
  const paths=await conferencePathProof();
  if(!paths.length || !paths.every(path=>path.hops>=3))throw Error("Multi-hop query returned no valid paths.");
  console.log(`PASS Path query: ${paths.length} actual path(s)`);
  for(const path of paths)console.log(`${path.names[0]} —INTERESTED_IN→ ${path.names[1]} ←ABOUT— ${path.names[2]} ←PRESENTS— ${path.names[3]} · room: ${path.room} · ${path.hops} hops`);
  await seedConferenceGraph();
  const repeated=await graphCounts();
  if(JSON.stringify(counts)!==JSON.stringify(repeated))throw Error("Seeding changed graph counts on a repeat.");
  console.log("PASS Idempotence: repeating the seed did not duplicate nodes or edges");
  await fs.mkdir("artifacts",{recursive:true});
  await fs.writeFile("artifacts/falkordb-check.json",JSON.stringify({graph:"conference",tls:true,checkedAt:new Date().toISOString(),counts,paths:paths.map(({names,relations,hops,room})=>({names,relations,hops,room})),browserQuery:BROWSER_PATH_QUERY},null,2));
}
main().catch(error=>{console.error(`FAIL ${safeFalkorError(error)}`);process.exitCode=1;}).finally(()=>closeFalkorDB());
