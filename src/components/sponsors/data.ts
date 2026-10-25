export type Sponsor = {
  id: string;
  name: string;
  category: string;
  tagline: string;
  sharedData: string;
  result: string;
  description: string;
  implemented: boolean;
  website: string;
  feature: string;
  href?: string;
  input: string;
  output: string;
  boundary: string;
  evidence: string;
  color: string;
};

export const sponsors: Sponsor[] = [
  {
    id: "openai", name: "OpenAI", category: "Twin intelligence", tagline: "Helps your twin find common ground.",
    sharedData: "Approved profile details", result: "A simulated twin conversation",
    description: "Your twin explores shared interests with fictional attendees in a simulated conversation. You decide whether to make an introduction.",
    implemented: true, website: "https://openai.com", feature: "Conference scouting", href: "/event/evt_demo/network",
    input: "Permission-approved profile fields, your goal when sharing is enabled, and a fictional attendee profile.",
    output: "Six structured dialogue turns, saved for replay. Matching scores remain deterministic.",
    boundary: "Requests use store: false. Without configuration, the app uses labeled seeded replays. Provider failures stay visible.",
    evidence: "src/lib/twin-openai.ts", color: "#e7f2ec",
  },
  {
    id: "brightdata", name: "Bright Data", category: "Public context", tagline: "Adds context to your twin’s profile.",
    sharedData: "A public website link", result: "A preview you can review",
    description: "Preview a public company or project website, then choose what to add to your twin’s profile. You review the text first.",
    implemented: true, website: "https://brightdata.com", feature: "Twin training", href: "/twin/train",
    input: "A user-submitted public HTTPS URL on the server’s approved hostname list.",
    output: "Page title, bounded excerpt, source URL, retrieval time, and extraction limitations.",
    boundary: "Private bios and conference goals are not sent. Live previews require the local development gate; production is read-only.",
    evidence: "src/features/brightdata/adapter.ts", color: "#eef0ff",
  },
  {
    id: "omi", name: "Omi", category: "Conversation capture", tagline: "Helps you remember the conversation.",
    sharedData: "Captions from your Omi bridge", result: "A private conversation transcript",
    description: "With permission, captions from your Omi device can become a private journal of a meeting you both accepted.",
    implemented: true, website: "https://www.omi.me", feature: "Meaningful Notes", href: "/meaningful-notes",
    input: "Participant-authorized captions from the configured device owner’s bridge.",
    output: "Live text passages in a private meeting journal, with gaps recorded for context.",
    boundary: "Both attendees must accept the meeting. Only the configured device owner can listen. The browser does not capture audio.",
    evidence: "src/app/api/events/[eventId]/meetings/[meetingId]/fieldnotes/live/route.ts", color: "#f2eafa",
  },
  {
    id: "gemini", name: "Google Gemini", category: "Meaningful memories", tagline: "Turns your notes into a personal magazine.",
    sharedData: "Conversation passages you approve", result: "A source-linked magazine",
    description: "Turn saved conversation passages into a private magazine, with links back to your notes. Generation starts only when you ask.",
    implemented: true, website: "https://gemini.google.com", feature: "Notes & magazine", href: "/meaningful-notes/demo",
    input: "Saved transcript passages and gap count, after explicit generation consent.",
    output: "A structured magazine edition with validated passage references. Images require separate consent and configuration.",
    boundary: "Private reflections, profiles, location, and twin negotiations are excluded. No generation runs on page load.",
    evidence: "src/features/fieldnotes/generate.ts", color: "#eaf1ff",
  },
  {
    id: "falkordb", name: "FalkorDB", category: "Relationship graph", tagline: "Explain why two people could connect.",
    sharedData: "Fictional conference interests", result: "Explainable relationship paths",
    description: "Queries a live FalkorDB conference graph to show shared interests and the relationships behind a possible connection.",
    implemented: true, website: "https://www.falkordb.com", feature: "Conference graph evidence", href: "/event/evt_demo/network",
    input: "Synthetic attendees, interests, talks, speakers, and rooms in the conference demo dataset.",
    output: "Graph-backed paths with relationship types, hop counts, and a query timestamp.",
    boundary: "The connection uses server-side TLS. Private profiles, transcripts, and meeting permissions are excluded. Graph evidence does not change match scores or consent.",
    evidence: "src/features/falkordb/server.ts · docs/falkordb-handoff.md", color: "#faeafa",
  },
  {
    id: "supabase", name: "Supabase", category: "Data infrastructure", tagline: "Keep accounts and app data together.",
    sharedData: "Planned: account records", result: "Planned: persistent storage",
    description: "Planned backend for persistent application data and authentication. The current demo uses local JSON storage.",
    implemented: false, website: "https://supabase.com", feature: "Storage & identity",
    input: "Planned: account-scoped application records.", output: "Planned: authenticated, persistent data access.",
    boundary: "No Supabase database or authentication service is configured. Demo identity is not production authentication.", evidence: "README.md · integration status", color: "#e7f5ed",
  },
  {
    id: "trueforge", name: "TrueForge", category: "Agent orchestration", tagline: "Coordinate conversations between twins.",
    sharedData: "Planned: approved twin details", result: "Planned: coordinated agents",
    description: "Planned agent orchestration integration. Twin scouting currently runs through the local engine with optional OpenAI conversation generation.",
    implemented: false, website: "https://trueforge.ai", feature: "Twin orchestration",
    input: "Planned: permission-scoped twin context.", output: "Planned: orchestrated twin conversations.",
    boundary: "No TrueForge service is configured or called by the current app.", evidence: "README.md · integration status", color: "#fff1e6",
  },
  {
    id: "qodo", name: "Qodo", category: "Developer tooling", tagline: "Help review and improve the code.",
    sharedData: "Planned: code changes", result: "Planned: review feedback",
    description: "Intended tooling for GitHub pull request review and code quality. A connected review workflow has not been verified in this repository.",
    implemented: false, website: "https://www.qodo.ai", feature: "Code review",
    input: "Planned: repository changes and pull request diffs.", output: "Planned: review findings and quality feedback.",
    boundary: "No attendee profiles, conversation transcripts, or live app data are sent through a Qodo integration.", evidence: "README.md · integration status", color: "#f0edff",
  },
];
