export type GraphPathEvidence = {
  names: string[];
  relations: string[];
  hops: number;
  room?: string;
  event?: string;
};
export type ConferenceGraphEvidence = {
  source: "falkordb";
  mode: "live";
  dataset: "synthetic_conference";
  graph: "conference";
  queriedAt: string;
  paths: GraphPathEvidence[];
};
export type FalkorSponsorStatus = {
  status: "passed" | "unavailable" | "not_configured";
  graph: "conference";
  checkedAt: string;
  counts?: { nodes: number; edges: number; namespaceNodes: number };
  paths?: GraphPathEvidence[];
};
