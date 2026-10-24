"use client";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowRight, Check, Clock3, Users } from "lucide-react";
import { PersonAvatar } from "@/components/ui/avatar";
import {
  connectionSummary,
  type Connection,
} from "@/components/connections/model";
const statusText = {
  new: "Your twin noticed a fit",
  waiting: "Invitation sent",
  incoming: "Would like to meet you",
  ready: "You both said yes",
  met: "A meaningful hello",
};
export default function ConferencePeopleRail({
  connections,
  loading,
  onOpen,
  onDetails,
}: {
  connections: Connection[];
  loading: boolean;
  onOpen: (connection: Connection) => void;
  onDetails: (connection: Connection) => void;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <aside
      className="conference-people"
      aria-label="Your conference connections"
    >
      <div className="conference-people-heading">
        <div>
          <span>GOOD PEOPLE. COMMON GROUND.</span>
          <h2>Your people.</h2>
        </div>
        <small>{connections.length || "—"}</small>
      </div>
      {loading ? (
        <div className="conference-people-loading" aria-label="Loading people">
          <div className="loading-shimmer" />
          <div className="loading-shimmer" />
        </div>
      ) : !connections.length ? (
        <div className="conference-people-empty">
          <Users size={25} strokeWidth={1.1} />
          <p>A few people worth meeting.</p>
          <small>Your twin will bring promising connections here.</small>
        </div>
      ) : (
        <div className="conference-people-list">
          <AnimatePresence mode="popLayout">
            {connections.map((connection, index) => (
              <motion.article
                key={connection.person.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{
                  duration: reduceMotion ? 0 : 0.4,
                  delay: reduceMotion ? 0 : Math.min(index * 0.07, 0.2),
                }}
                className={`conference-person is-${connection.status}`}
              >
                <button
                  className="conference-person-profile"
                  onClick={() => onDetails(connection)}
                  aria-label={`About ${connection.person.name}`}
                >
                  <PersonAvatar person={connection.person} size={47} />
                  <span>
                    <strong>{connection.person.name}</strong>
                    <small>{connection.person.role}</small>
                  </span>
                </button>
                <p className="conference-person-reason">
                  {connectionSummary(connection)}
                </p>
                <div className="conference-person-bottom">
                  <span>
                    {connection.status === "ready" ||
                    connection.status === "met" ? (
                      <Check size={11} />
                    ) : connection.status === "waiting" ? (
                      <Clock3 size={11} />
                    ) : (
                      <i />
                    )}
                    {statusText[connection.status]}
                  </span>
                  {connection.status === "waiting" ? (
                    <small>Their turn</small>
                  ) : (
                    <button
                      onClick={() => onOpen(connection)}
                      aria-label={`${connection.status === "ready" ? "Meet up with" : connection.status === "met" ? "View your moment with" : connection.status === "incoming" ? "Respond to" : "Say hello to"} ${connection.person.name}`}
                    >
                      {connection.status === "ready"
                        ? "Meet up"
                        : connection.status === "met"
                          ? "View moment"
                          : connection.status === "incoming"
                            ? "Respond"
                            : "Say hello"}
                      <ArrowRight size={13} />
                    </button>
                  )}
                </div>
              </motion.article>
            ))}
          </AnimatePresence>
        </div>
      )}
      <p className="conference-people-footnote">
        The right people. At the right conference.
      </p>
    </aside>
  );
}
