export type Sponsor = {
  id: string;
  name: string;
  category: string;
  tagline: string;
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
    id: "openai", name: "OpenAI", category: "Twin intelligence", tagline: "A thoughtful conversation before the hello.",
    description: "Generates six-turn simulated conversations between your twin and fictional attendees, helping you explore common ground before choosing an introduction.",
    implemented: true, website: "https://openai.com", feature: "Conference scouting", href: "/event/evt_demo/network",
    input: "Permission-approved profile fields, your goal when sharing is enabled, and a fictional attendee profile.",
    output: "Six structured dialogue turns, saved for replay. Matching scores remain deterministic.",
    boundary: "Requests use store: false. Without configuration, the app uses labeled seeded replays. Provider failures stay visible.",
    evidence: "src/lib/twin-openai.ts", color: "#e7f2ec",
  },
  {
    id: "brightdata", name: "Bright Data", category: "Public context", tagline: "More context. Always with your say.",
    description: "Uses Web Unlocker to preview an approved public company or project page. You review and edit the excerpt before adding it to your twin’s bio.",
    implemented: true, website: "https://brightdata.com", feature: "Twin training", href: "/twin/train",
    input: "A user-submitted public HTTPS URL on the server’s approved hostname list.",
    output: "Page title, bounded excerpt, source URL, retrieval time, and extraction limitations.",
    boundary: "Private bios and conference goals are not sent. Live previews require the local development gate; production is read-only.",
    evidence: "src/features/brightdata/adapter.ts", color: "#eef0ff",
  },
  {
    id: "omi", name: "Omi", category: "Conversation capture", tagline: "Be present. Keep the meaningful parts.",
    description: "Receives captions from a separately running Omi bridge, so an approved conversation can become a private journal.",
    implemented: true, website: "https://www.omi.me", feature: "Meaningful Notes", href: "/meaningful-notes",
    input: "Participant-authorized captions from the configured device owner’s bridge.",
    output: "Live text passages in a private meeting journal, with gaps recorded for context.",
    boundary: "Both attendees must accept the meeting. Only the configured device owner can listen. The browser does not capture audio.",
    evidence: "src/app/api/events/[eventId]/meetings/[meetingId]/fieldnotes/live/route.ts", color: "#f2eafa",
  },
  {
    id: "gemini", name: "Google Gemini", category: "Meaningful memories", tagline: "Turn a conversation into a story worth keeping.",
    description: "Creates a private magazine edition from saved conversation passages. An optional image model can create separately approved conceptual illustrations.",
    implemented: true, website: "https://gemini.google.com", feature: "Notes & magazine", href: "/meaningful-notes/demo",
    input: "Saved transcript passages and gap count, after explicit generation consent.",
    output: "A structured magazine edition with validated passage references. Images require separate consent and configuration.",
    boundary: "Private reflections, profiles, location, and twin negotiations are excluded. No generation runs on page load.",
    evidence: "src/features/fieldnotes/generate.ts", color: "#eaf1ff",
  },
  {
    id: "falkordb", name: "FalkorDB", category: "Relationship graph", tagline: "A path to explainable connections.",
    description: "Planned graph database integration for relationship discovery. The current app derives evidence paths locally from approved fixture fields.",
    implemented: false, website: "https://www.falkordb.com", feature: "Network graph",
    input: "Planned: approved relationship and interest data.", output: "Planned: graph-backed relationship paths and connection explanations.",
    boundary: "No FalkorDB connection or queries are configured. Current graph results are local demo data.", evidence: "README.md · integration status", color: "#faeafa",
  },
  {
    id: "supabase", name: "Supabase", category: "Data infrastructure", tagline: "A foundation for what comes next.",
    description: "Planned backend for persistent application data and authentication. The current demo uses local JSON storage.",
    implemented: false, website: "https://supabase.com", feature: "Storage & identity",
    input: "Planned: account-scoped application records.", output: "Planned: authenticated, persistent data access.",
    boundary: "No Supabase database or authentication service is configured. Demo identity is not production authentication.", evidence: "README.md · integration status", color: "#e7f5ed",
  },
  {
    id: "trueforge", name: "TrueForge", category: "Agent orchestration", tagline: "An intended home for twin collaboration.",
    description: "Planned agent orchestration integration. Twin scouting currently runs through the local engine with optional OpenAI conversation generation.",
    implemented: false, website: "https://trueforge.ai", feature: "Twin orchestration",
    input: "Planned: permission-scoped twin context.", output: "Planned: orchestrated twin conversations.",
    boundary: "No TrueForge service is configured or called by the current app.", evidence: "README.md · integration status", color: "#fff1e6",
  },
  {
    id: "qodo", name: "Qodo", category: "Developer tooling", tagline: "Care for the code behind the connections.",
    description: "Intended tooling for GitHub pull request review and code quality. A connected review workflow has not been verified in this repository.",
    implemented: false, website: "https://www.qodo.ai", feature: "Code review",
    input: "Planned: repository changes and pull request diffs.", output: "Planned: review findings and quality feedback.",
    boundary: "No attendee profiles, conversation transcripts, or live app data are sent through a Qodo integration.", evidence: "README.md · integration status", color: "#f0edff",
  },
];
