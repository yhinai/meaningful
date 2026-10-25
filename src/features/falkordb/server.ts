import { FalkorDB } from "falkordb";
import { CONFERENCE_GRAPH, GRAPH_NAMESPACE, MATCH_PATH_QUERY } from "./queries";
import type { ConferenceGraphEvidence, GraphPathEvidence } from "./types";
let connection: Promise<FalkorDB> | undefined;
export function falkorDBConfigured() {
  try { return ["falkors:","rediss:"].includes(new URL(process.env.FALKORDB_URL ?? "").protocol); }
  catch { return false; }
}
export function safeFalkorError(error:unknown) {
  let message = error instanceof Error ? error.message : "The graph request failed.";
  const value=process.env.FALKORDB_URL;
  if (value) {
    message=message.replaceAll(value,"[FalkorDB connection]");
    try {const secret=decodeURIComponent(new URL(value).password);if(secret)message=message.replaceAll(secret,"[redacted]");} catch {}
  }
  return message.replace(/(?:falkors?|rediss?):\/\/[^\s]+/gi,"[FalkorDB connection]").slice(0,400);
}
export async function connectFalkorDB() {
  if (!falkorDBConfigured()) throw Error("A server-side TLS FALKORDB_URL is required.");
  if (!connection) {
    connection=FalkorDB.connect({url:process.env.FALKORDB_URL,
      socket:{tls:true,connectTimeout:8000,reconnectStrategy:false},retryWritesOnConnectionLoss:false,
    }).then(db=>{
      db.on("error",()=>{connection=undefined;void db.close().catch(()=>{});});
      return db;
    }).catch(error=>{connection=undefined;throw Error(safeFalkorError(error));});
  }
  return connection;
}
export async function closeFalkorDB() {
  const pending=connection;connection=undefined;
  if(pending)await (await pending).close();
}
export async function conferenceGraph() {
  return (await connectFalkorDB()).selectGraph(CONFERENCE_GRAPH);
}
export function normalizeGraphPaths(rows:GraphPathEvidence[] = []): GraphPathEvidence[] {
  return rows.filter(row=>Array.isArray(row.names) && Array.isArray(row.relations) &&
    row.names.every(name=>typeof name==="string") && row.relations.every(type=>typeof type==="string") &&
    Number.isInteger(row.hops) && row.hops>0 && row.hops===row.relations.length && row.names.length===row.hops+1)
    .map(({names,relations,hops,room,event})=>({names,relations,hops,...(room?{room}:{}),...(event?{event}:{})}));
}
export async function getMatchGraphEvidence(viewerId:string,candidateId:string):Promise<ConferenceGraphEvidence> {
  const graph=await conferenceGraph();
  const result=await graph.roQuery<GraphPathEvidence>(MATCH_PATH_QUERY,{
    params:{viewerId,candidateId,namespace:GRAPH_NAMESPACE},TIMEOUT:4000,
  });
  return {source:"falkordb",mode:"live",dataset:"synthetic_conference",graph:CONFERENCE_GRAPH,
    queriedAt:new Date().toISOString(),paths:normalizeGraphPaths(result.data)};
}
