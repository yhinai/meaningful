export const CONFERENCE_GRAPH = "conference";
export const GRAPH_NAMESPACE = "meaningfulmeet_conference_demo_v1";
export const CONFERENCE_PATH_QUERY = `MATCH p=(a:Attendee {id: $attendeeId, lab_namespace: $namespace})-[:INTERESTED_IN]->(topic:Topic)<-[:ABOUT]-(talk:Talk)<-[:PRESENTS]-(speaker:Speaker)
MATCH roomPath=(talk)-[:IN_ROOM]->(room:Room)
RETURN p, roomPath, [n IN nodes(p) | n.name] AS names,
       [r IN relationships(p) | type(r)] AS relations, length(p) AS hops,
       room.name AS room ORDER BY talk.name LIMIT 3`;
export const MATCH_PATH_QUERY = `MATCH p=(a:Attendee {id: $viewerId, lab_namespace: $namespace})-[:INTERESTED_IN]->(topic:Topic)<-[:INTERESTED_IN]-(b:Attendee {id: $candidateId, lab_namespace: $namespace})
MATCH (a)-[:ATTENDS]->(event:Event)<-[:ATTENDS]-(b)
RETURN [n IN nodes(p) | n.name] AS names,
       [r IN relationships(p) | type(r)] AS relations,
       length(p) AS hops, event.name AS event LIMIT 3`;
export const BROWSER_PATH_QUERY = `MATCH p=(a:Attendee {id: 'lab_alex', lab_namespace: '${GRAPH_NAMESPACE}'})-[:INTERESTED_IN]->(:Topic)<-[:ABOUT]-(talk:Talk)<-[:PRESENTS]-(:Speaker)
MATCH roomPath=(talk)-[:IN_ROOM]->(:Room)
OPTIONAL MATCH metPath=(a)-[:MET]->(:Attendee)
RETURN p, roomPath, metPath`;
