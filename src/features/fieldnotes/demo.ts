import type { Edition, Fieldnotes, Passage } from "./model";

export const demoConversation = [
  {
    id: "demo-1",
    speaker: "You",
    initials: "Y",
    text: "I keep thinking about how AI could give us more time for the human part of our work. What are you working on?",
  },
  {
    id: "demo-2",
    speaker: "Sofia",
    initials: "SC",
    text: "We’re building research tools. The biggest lesson has been to listen first. A good customer interview can change the whole direction of a product.",
  },
  {
    id: "demo-3",
    speaker: "You",
    initials: "Y",
    text: "That’s exactly what we need. We’ve been moving quickly, but I’d love to ask better questions before building the next feature.",
  },
  {
    id: "demo-4",
    speaker: "Sofia",
    initials: "SC",
    text: "I’ll send you our interview guide tomorrow. We could compare notes next week and see what we learn.",
  },
];
export const demoSources: Passage[] = demoConversation.map((turn) => ({
  id: turn.id,
  text: `${turn.speaker}: ${turn.text}`,
}));
export const demoEdition: Edition = {
  title: "Better questions. More human answers.",
  standfirst:
    "One conversation opened a door: a shared curiosity about thoughtful AI, a new approach to listening, and a reason to meet again.",
  sections: [
    {
      title: "Making room for the human part.",
      summary:
        "The conversation began with a question about time: could AI make more space for the human part of work? Sofia connected that idea to her team’s experience building research tools. Their lesson was to listen first, letting customer interviews challenge the direction of a product rather than simply confirm it.\n\nA possible connection emerged between the two perspectives: thoughtful tools might begin with more thoughtful conversations. That is an interpretation of the discussion, and an idea worth exploring together.",
      source_ids: ["demo-1", "demo-2"],
    },
    {
      title: "A little pause before the next feature.",
      summary:
        "You described a familiar tension: moving quickly while wanting to ask better questions. The next feature was an opportunity to make that pause intentional.\n\nThe discussion did not settle on a research plan. It surfaced a shared interest in learning before building, with Sofia’s interview guide offering a practical starting point.",
      source_ids: ["demo-2", "demo-3", "demo-4"],
    },
    {
      title: "An introduction becomes a next chapter.",
      summary:
        "Sofia said she would send her team’s interview guide tomorrow. That was the conversation’s concrete commitment. Comparing notes the following week was also proposed, leaving an opening to keep learning together.\n\nA useful connection can continue through a small exchange: a guide, a better question, and a conversation to revisit.",
      source_ids: ["demo-4"],
    },
  ],
  takeaways: [
    {
      text: "Make room for the human part of the work.",
      source_ids: ["demo-1"],
    },
    {
      text: "Listen before deciding what to build next.",
      source_ids: ["demo-2", "demo-3"],
    },
    {
      text: "A small exchange can become a reason to reconnect.",
      source_ids: ["demo-4"],
    },
  ],
  followups: [
    {
      text: "Sofia will send the team’s interview guide tomorrow.",
      kind: "commitment",
      source_ids: ["demo-4"],
    },
    {
      text: "Arrange a time next week to compare interview notes.",
      kind: "suggestion",
      source_ids: ["demo-4"],
    },
    {
      text: "Try the guide before planning the next feature.",
      kind: "suggestion",
      source_ids: ["demo-3", "demo-4"],
    },
  ],
};
export function makeDemoJournal(): Fieldnotes {
  return {
    revision: 1,
    note: "",
    transcript: demoSources
      .map((source) =>
        JSON.stringify({
          type: "transcript",
          event_id: source.id,
          text: source.text,
        }),
      )
      .join("\n"),
    sources: demoSources,
    gapCount: 0,
    edition: demoEdition,
    completedFollowups: [],
  };
}
