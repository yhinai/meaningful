import { attendees, defaultProfile } from "@/lib/fixtures";
import { conferenceGraph } from "./server";
import { CONFERENCE_PATH_QUERY, GRAPH_NAMESPACE } from "./queries";
import type { GraphPathEvidence } from "./types";

/** Idempotent synthetic seed, scoped to our namespace; no product meetings or private profiles are read. */
export async function seedConferenceGraph() {
  const graph=await conferenceGraph();
  const rows=[...attendees.map(person=>({id:person.id,name:person.name,topics:person.topics})),
    {id:"usr_self",name:defaultProfile.name,topics:["AI agents","Design","Product strategy"]},
    {id:"lab_alex",name:"Alex Morgan (lab)",topics:["AI agents"]},
    {id:"lab_jordan",name:"Jordan Lee (lab)",topics:["AI agents"]},
  ];
  await graph.query(`MERGE (event:Event {id:'evt_demo',lab_namespace:$namespace}) SET event.name='MeaningfulMeet Conference (synthetic)'
WITH event UNWIND $people AS person
MERGE (a:Attendee {id:person.id,lab_namespace:$namespace}) SET a.name=person.name,a.synthetic=true
MERGE (a)-[:ATTENDS]->(event)
WITH a,person UNWIND person.topics AS topicName
MERGE (topic:Topic {name:topicName,lab_namespace:$namespace})
MERGE (a)-[:INTERESTED_IN]->(topic)`,{params:{namespace:GRAPH_NAMESPACE,people:rows},TIMEOUT:5000});
  await graph.query(`UNWIND $sessions AS item
MERGE (speaker:Speaker {id:item.speakerId,lab_namespace:$namespace}) SET speaker.name=item.speakerName,speaker.synthetic=true
MERGE (talk:Talk {id:item.id,lab_namespace:$namespace}) SET talk.name=item.title,talk.synthetic=true
MERGE (topic:Topic {name:item.topic,lab_namespace:$namespace})
MERGE (room:Room {id:item.roomId,lab_namespace:$namespace}) SET room.name=item.roomName,room.synthetic=true
MERGE (speaker)-[:PRESENTS]->(talk)
MERGE (talk)-[:ABOUT]->(topic)
MERGE (talk)-[:IN_ROOM]->(room)`,{params:{namespace:GRAPH_NAMESPACE,sessions:[
    {id:"lab_talk_agents",title:"Building Useful AI Agents (lab)",speakerId:"lab_speaker_maya",speakerName:"Maya Chen (lab)",topic:"AI agents",roomId:"lab_room_atrium",roomName:"Atrium (lab)"},
    {id:"lab_talk_design",title:"Designing Human Connections (lab)",speakerId:"lab_speaker_avery",speakerName:"Avery Park (lab)",topic:"Design",roomId:"lab_room_studio",roomName:"Studio (lab)"},
  ]},TIMEOUT:5000});
  await graph.query(`MATCH (a:Attendee {id:'lab_alex',lab_namespace:$namespace}),(b:Attendee {id:'lab_jordan',lab_namespace:$namespace})
MERGE (a)-[met:MET]->(b) SET met.synthetic=true`,{params:{namespace:GRAPH_NAMESPACE},TIMEOUT:5000});
}
export async function graphCounts() {
  const graph=await conferenceGraph();
  const nodes=await graph.roQuery<{nodes:number}>("MATCH (n) RETURN count(n) AS nodes",{TIMEOUT:4000});
  const edges=await graph.roQuery<{edges:number}>("MATCH ()-[r]->() RETURN count(r) AS edges",{TIMEOUT:4000});
  const scoped=await graph.roQuery<{nodes:number}>("MATCH (n {lab_namespace:$namespace}) RETURN count(n) AS nodes",{params:{namespace:GRAPH_NAMESPACE},TIMEOUT:4000});
  return {nodes:nodes.data?.[0]?.nodes??0,edges:edges.data?.[0]?.edges??0,namespaceNodes:scoped.data?.[0]?.nodes??0};
}
export async function conferencePathProof() {
  const graph=await conferenceGraph();
  const result=await graph.roQuery<GraphPathEvidence>(CONFERENCE_PATH_QUERY,{params:{namespace:GRAPH_NAMESPACE,attendeeId:"lab_alex"},TIMEOUT:4000});
  return result.data??[];
}
