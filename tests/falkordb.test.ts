import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { falkorDBConfigured, normalizeGraphPaths, safeFalkorError } from "../src/features/falkordb/server";
import { BROWSER_PATH_QUERY, CONFERENCE_GRAPH, GRAPH_NAMESPACE, MATCH_PATH_QUERY } from "../src/features/falkordb/queries";
import { GET } from "../src/app/api/integrations/falkordb/route";
const original=process.env.FALKORDB_URL;
test.after(()=>{if(original===undefined)delete process.env.FALKORDB_URL;else process.env.FALKORDB_URL=original;});
test("FalkorDB keeps TLS mandatory and redacts connection credentials",()=>{
  process.env.FALKORDB_URL="redis://example.com:6379";
  assert.equal(falkorDBConfigured(),false);
  process.env.FALKORDB_URL="falkors://tester:private-test-password@example.com:53379";
  assert.equal(falkorDBConfigured(),true);
  const message=safeFalkorError(Error(`Failed ${process.env.FALKORDB_URL} private-test-password`));
  assert.equal(message.includes("private-test-password"),false);
  assert.equal(message.includes("tester:"),false);
});
test("graph evidence accepts only actual complete paths and preserves returned hop counts",()=>{
  assert.deepEqual(normalizeGraphPaths([{names:["Alex","AI agents","Theo"],relations:["INTERESTED_IN","INTERESTED_IN"],hops:2,event:"Synthetic event"}]),[
    {names:["Alex","AI agents","Theo"],relations:["INTERESTED_IN","INTERESTED_IN"],hops:2,event:"Synthetic event"},
  ]);
  assert.deepEqual(normalizeGraphPaths([{names:["Alex","Theo"],relations:["INTERESTED_IN"],hops:9}]),[]);
  assert.equal(CONFERENCE_GRAPH,"conference");
  assert.ok(MATCH_PATH_QUERY.includes("$candidateId") && MATCH_PATH_QUERY.includes("$namespace"));
  assert.ok(BROWSER_PATH_QUERY.includes(GRAPH_NAMESPACE));
});
test("public graph endpoint rejects unknown accounts and candidates without making a database call",async()=>{
  process.env.FALKORDB_URL="falkors://tester:private-test-password@example.com:53379";
  const invalid=await GET(new NextRequest("http://localhost/api/integrations/falkordb?candidateId=DELETE"));
  assert.equal(invalid.status,403);
  const other=await GET(new NextRequest("http://localhost/api/integrations/falkordb?candidateId=usr_16",{headers:{cookie:"demo_user=unknown"}}));
  assert.equal(other.status,403);
  const config=await GET(new NextRequest("http://localhost/api/integrations/falkordb"));
  const text=await config.text();
  assert.equal(text.includes("private-test-password"),false);
  assert.equal(text.includes("example.com"),false);
  delete process.env.FALKORDB_URL;
  const off=await GET(new NextRequest("http://localhost/api/integrations/falkordb?candidateId=usr_16"));
  assert.deepEqual(await off.json(),{configured:false});
});
