import test from "node:test";
import assert from "node:assert/strict";
import { scoutActivity } from "../src/components/conference/scout-activity";
import type { TwinRun } from "../src/lib/types";
import { defaultGoals, defaultProfile } from "../src/lib/fixtures";

function run(): TwinRun {
  return { id:"scout", eventId:"evt_demo", ownerUserId:"usr_self", status:"running", phase:"Discovering", createdAt:"2026-10-24T00:00:00Z", profileVersion:1,
    profileSnapshot:defaultProfile, goalsSnapshot:defaultGoals, rankings:[{candidateId:"usr_01",rank:1,score:90,reasons:[],evidencePaths:[],breakdown:{goalComplementarity:30,expertiseAlignment:20,sharedTopics:20,mutualInterest:10,conversationFit:10}}],
    batchSize:9, messages:[], events:[], discoveredCount:0, conversationCount:0, qualifiedCount:0, demo:true };
}
test("scout activity reflects saved events and never invents conversations or completion", () => {
  assert.equal(scoutActivity().progress,0);
  const current = run();
  assert.equal(scoutActivity(current).discovered.size,0);
  const append = (type:string) => current.events.push({event_id:current.eventId,run_id:current.id,seq:current.events.length+1,type,timestamp:current.createdAt,payload:{candidate_id:"usr_01"}});
  append("candidate.discovered"); append("candidate.discovered");
  assert.equal(scoutActivity(current).discovered.size,1);
  append("negotiation.started");
  assert.equal(scoutActivity(current).activeId,"usr_01");
  assert.ok(scoutActivity(current).progress<100);
  current.status="failed";
  assert.equal(scoutActivity(current).activeId,undefined);
  assert.equal(scoutActivity(current).completed,false);
  current.status="running"; append("negotiation.completed");
  assert.equal(scoutActivity(current).finished.size,1);
  assert.equal(scoutActivity(current).activeId,undefined);
  current.status="completed";
  assert.equal(scoutActivity(current).progress,100);
});
