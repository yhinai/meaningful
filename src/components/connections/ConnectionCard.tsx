"use client";
import { motion } from "motion/react";
import { ArrowRight, Check, Clock3, Sparkles } from "lucide-react";
import { PersonAvatar } from "@/components/ui/avatar";
import { connectionSummary, type Connection } from "./model";

const labels = {
  new: "A shared possibility",
  waiting: "Invitation sent",
  incoming: "Would like to meet",
  ready: "You both said yes",
  met: "A meaningful hello",
};
export default function ConnectionCard({
  connection,
  index,
  onOpen,
  onDetails,
}: {
  connection: Connection;
  index: number;
  onOpen: () => void;
  onDetails: () => void;
}) {
  const { person, status } = connection;
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{
        duration: 0.45,
        delay: Math.min(index * 0.07, 0.21),
        ease: [0.22, 1, 0.36, 1],
      }}
      className={`connection-card is-${status}`}
    >
      <button
        className="connection-person"
        onClick={onDetails}
        aria-label={`About ${person.name}`}
      >
        <PersonAvatar person={person} size={68} />
        <span>
          <strong>{person.name}</strong>
          <small>
            {person.role}
            <span> · </span>
            {person.company}
          </small>
        </span>
      </button>
      <div className="connection-description">
        <p>{connectionSummary(connection)}</p>
        <div>
          {person.topics.slice(0, 2).map((topic) => (
            <span key={topic}>{topic}</span>
          ))}
        </div>
      </div>
      <div className="connection-card-bottom">
        <span className="connection-status">
          {status === "ready" || status === "met" ? (
            <Check size={12} />
          ) : status === "waiting" ? (
            <Clock3 size={12} />
          ) : (
            <Sparkles size={12} />
          )}
          {labels[status]}
        </span>
        {status === "waiting" ? (
          <span className="connection-pending">Their turn</span>
        ) : (
          <button
            className={`connection-action ${status === "ready" || status === "incoming" ? "primary" : ""}`}
            onClick={onOpen}
          >
            {status === "ready"
              ? "Meet up"
              : status === "incoming"
                ? "Respond"
                : status === "met"
                  ? "View moment"
                  : "Say hello"}
            <ArrowRight size={14} />
          </button>
        )}
      </div>
    </motion.article>
  );
}
