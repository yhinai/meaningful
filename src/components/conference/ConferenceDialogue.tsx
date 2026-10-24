"use client";
import { ChevronDown, MessageCircle } from "lucide-react";
import type { TwinMessage } from "@/lib/types";
export default function ConferenceDialogue({
  messages,
  firstName,
}: {
  messages: TwinMessage[];
  firstName: string;
}) {
  return (
    <details className="conference-candidate-dialogue">
      <summary>
        <MessageCircle size={14} />
        Twin conversation
        <ChevronDown size={14} />
      </summary>
      <small>Seeded demo replay · approved fields only</small>
      {messages.map((message) => (
        <div key={message.id}>
          <span>
            {message.speaker === "your_twin"
              ? "Your twin"
              : `${firstName}’s twin`}
          </span>
          <p>{message.text}</p>
        </div>
      ))}
    </details>
  );
}
