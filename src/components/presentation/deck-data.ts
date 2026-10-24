export const slides = [
  {
    title: "A meaningful beginning",
    section: "The possibility",
    duration: "20 sec",
    notes:
      "At a conference, the person who could change your career or your startup might be standing ten feet away. But you may never meet. We built MeaningfulMeet to fix that.",
  },
  {
    title: "Beyond chance",
    section: "The problem",
    duration: "20 sec",
    notes:
      "Conference apps have attendee lists, schedules, and QR codes. But a list doesn't know what I want, can't advocate for me, and doesn't turn a chance encounter into a lasting connection.",
  },
  {
    title: "Meet your twin",
    section: "Your personal agent",
    duration: "25 sec",
    notes:
      "The twin doesn't just read a badge. It learns what you can offer, what you're looking for, and what you're comfortable sharing. Then it gets a mission for this specific event.",
  },
  {
    title: "The right connection",
    section: "The intelligence",
    duration: "35 sec",
    notes:
      "In this illustrative replay, the engine ranks twenty promising attendees and lets the top three twins exchange approved information. A strong match comes with an explanation. Both people still choose whether to meet. Scores are heuristics, not predictions.",
  },
  {
    title: "A real hello",
    section: "The human moment",
    duration: "25 sec",
    notes:
      "Once both humans say yes, people agree on a meeting spot, find each other with a venue plan and voluntary short-lived check-ins, and verify the meeting. The XP and sponsor reward shown here are simulated demo mechanics.",
  },
  {
    title: "A story worth keeping",
    section: "The lasting memory",
    duration: "25 sec",
    notes:
      "With permission, OMI conversation insights can become a personal event magazine: who you met, what you learned, and what to do next. This synthetic example previews our teammate's magazine experience; no recording is activated here.",
  },
  {
    title: "MeaningfulMeet",
    section: "A little more human",
    duration: "30 sec",
    notes:
      "We built an AI agent that finds meaningful people, gets you into the same room, and helps you remember why it mattered. These are our intended technology integrations; completion has not been independently verified. Open the working app to see the product.",
  },
] as const;

// Public-stage content is deliberately synthetic. No private app store is read.
export const technologyIntegrations = [
  {
    name: "FalkorDB",
    role: "Relationship graphs & explainable connections",
    status: "Fixture graph in this deck",
  },
  {
    name: "Bright Data",
    role: "Permitted public-data enrichment",
    status: "Integration unverified",
  },
  {
    name: "TrueForge + OpenAI",
    role: "Twin agents & structured conversations",
    status: "Illustrative replay in this deck",
  },
  {
    name: "Qodo",
    role: "GitHub PR review & code quality",
    status: "Not yet verified",
  },
];
