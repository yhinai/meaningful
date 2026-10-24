"use client";
import { Sparkles, ChevronDown, ShieldCheck } from "lucide-react";
import { PersonAvatar } from "@/components/ui/avatar";
import type { Connection } from "./model";
import type { DemoState } from "@/lib/types";
import ConferenceDialogue from "@/components/conference/ConferenceDialogue";

const rubric = [
  ["goalComplementarity", "Shared intention", 35],
  ["expertiseAlignment", "Complementary experience", 25],
  ["sharedTopics", "Common interests", 15],
  ["mutualInterest", "Availability", 15],
  ["conversationFit", "Conversation style", 10],
] as const;
export default function ConnectionDetails({
  connection,
  state,
}: {
  connection: Connection;
  state?: DemoState;
}) {
  const { person, match } = connection;
  const run =
    state?.runs.find((item) => item.id === match?.runId) ?? state?.runs.at(-1);
  const messages =
    run?.messages.filter((message) => message.candidateId === person.id) ?? [];
  return (
    <div className="connection-detail-content">
      <PersonAvatar person={person} size={80} />
      <h3>{person.name}</h3>
      <p className="connection-detail-role">
        {person.role} · {person.company}
      </p>
      <p className="connection-detail-bio">{person.bio}</p>
      {match && (
        <>
          <div className="connection-detail-fit">
            <Sparkles size={15} />
            <span>A little common ground</span>
            <strong>
              {match.score}
              <small>/100</small>
            </strong>
          </div>
          <p className="connection-fit-reason">{match.reasons[0]}</p>
          <details className="connection-explanation">
            <summary>
              Why your twin noticed <ChevronDown size={14} />
            </summary>
            <div>
              {rubric.map(([key, label, max]) => (
                <p key={key}>
                  <span>{label}</span>
                  <strong>
                    {match.breakdown[key]}
                    <small> / {max}</small>
                  </strong>
                </p>
              ))}
              <small>
                Product fit heuristic · {match.scoringVersion}. Seeded demo
                conversations; verify the fit together.
              </small>
            </div>
          </details>
        </>
      )}
      {messages.length > 0 && (
        <ConferenceDialogue
          messages={messages}
          firstName={person.name.split(" ")[0]}
        />
      )}
      <p className="connection-detail-privacy">
        <ShieldCheck size={13} />
        Only approved profile information is shared.
      </p>
    </div>
  );
}
