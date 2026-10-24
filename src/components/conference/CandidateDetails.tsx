"use client";
import { ShieldCheck } from "lucide-react";
import type { DemoState, Person } from "@/lib/types";
import { PersonAvatar } from "@/components/ui/avatar";
import ConferenceDialogue from "./ConferenceDialogue";
export default function CandidateDetails({
  person,
  state,
}: {
  person: Person;
  state: DemoState;
}) {
  const run = state.runs.at(-1);
  const messages =
    run?.messages.filter((message) => message.candidateId === person.id) ?? [];
  const ranking = run?.rankings.find((item) => item.candidateId === person.id);
  const rejected = run?.events.some(
    (event) =>
      event.type === "match.rejected" &&
      event.payload.candidate_id === person.id,
  );
  return (
    <div className="conference-candidate">
      <PersonAvatar person={person} size={80} />
      <h3>{person.name}</h3>
      <p className="conference-candidate-role">
        {person.role} · {person.company}
      </p>
      <div className="conference-candidate-topics">
        {person.topics.map((topic) => (
          <span key={topic}>{topic}</span>
        ))}
      </div>
      <p className="conference-candidate-bio">{person.bio}</p>
      {ranking && (
        <p className="conference-candidate-reason">{ranking.reasons[0]}</p>
      )}
      <p className="conference-candidate-status">
        {rejected
          ? "Your twins found a difference in what you’re looking for. No introduction was suggested."
          : run?.status === "running"
            ? "Your twin is exploring the community. Introductions appear when a conversation confirms the fit."
            : "Part of this conference’s community. Your twin hasn’t suggested an introduction yet."}
      </p>
      {messages.length > 0 && (
        <ConferenceDialogue
          messages={messages}
          firstName={person.name.split(" ")[0]}
        />
      )}
      <p className="conference-candidate-privacy">
        <ShieldCheck size={12} />
        Only approved conference profile information is shown.
      </p>
    </div>
  );
}
