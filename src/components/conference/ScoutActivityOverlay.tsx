"use client";
import { motion } from "motion/react";
import { ArrowRight, LoaderCircle, MessageCircle, Search, ShieldCheck, Sparkles } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { PersonAvatar } from "@/components/ui/avatar";
import TwinCharacter from "@/components/twin-character/TwinCharacter";
import type { DemoState } from "@/lib/types";
import { scoutActivity } from "./scout-activity";
import "./scout-activity.css";

export default function ScoutActivityOverlay({ open, onClose, state, runId, error, onRetry }: {
  open: boolean; onClose: () => void; state: DemoState | null;
  runId: string | null; error: string; onRetry: () => void;
}) {
  const run = state?.runs.find((item) => item.id === runId && item.ownerUserId === state.activeUserId);
  const activity = scoutActivity(run);
  const message = run?.messages.at(-1);
  const messagePerson = state?.candidates.find((person) => person.id === message?.candidateId);
  const currentPerson = state?.candidates.find((person) => person.id === (activity.activeId ?? message?.candidateId));
  const title = activity.completed ? "A little more common ground." : activity.failed || error ? "Your twin needs a moment." : "Your twin, out meeting people.";
  const status = error ? error : activity.failed ? "This scout stopped. Your earlier connections are saved." : activity.completed
    ? `${run?.qualifiedCount ?? 0} new possibilities. You choose who comes next.`
    : activity.activeId ? `Talking with ${currentPerson?.name.split(" ")[0] ?? "another attendee"}’s twin`
    : activity.discovered.size ? "Finding the common ground" : "Looking for your kind of people";
  return <Dialog open={open} onClose={onClose} variant="wide" title="Your Digital Twin"
    description={title}>
    <div className="scout-experience">
      <div className="scout-live-status" role="status" aria-live="polite">
        {activity.completed ? <Sparkles size={16} /> : error || activity.failed ? <ShieldCheck size={16} /> : <LoaderCircle size={16} className="scout-loading" />}
        <span>{status}</span>
      </div>
      <div className="scout-main">
        <div className="scout-scene" aria-label="Your twin’s scouting circle">
          <div className="scout-orbit" aria-hidden="true" />
          <div className="scout-own-twin">
            <TwinCharacter size={142} personId={state?.activeUserId} mood={activity.completed ? "happy" : run && !activity.failed ? "working" : "idle"} />
            <strong>Your twin</strong>
            <small>{activity.completed ? "Back with possibilities" : "A little more you"}</small>
          </div>
          {Array.from({ length: activity.target || 9 }, (_, index) => {
            const ranking = run?.rankings[index];
            const person = state?.candidates.find((item) => item.id === ranking?.candidateId);
            const visible = person && activity.discovered.has(person.id);
            const angle = (index / (activity.target || 9)) * Math.PI * 2 - Math.PI / 2;
            return <div key={ranking?.candidateId ?? index} className={`scout-orbit-person ${person?.id === activity.activeId ? "is-talking" : ""}`}
              style={{ left: `${50 + Math.cos(angle) * 39}%`, top: `${50 + Math.sin(angle) * 38}%` }}>
              {visible ? <motion.div initial={{ opacity: 0, scale: .7 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", stiffness: 220, damping: 24 }}>
                <PersonAvatar person={person} size={49} />
                <strong>{person.name.split(" ")[0]}</strong>
                <small>{activity.finished.has(person.id) ? "Conversation saved" : person.id === activity.activeId ? "Twins talking" : "Discovered"}</small>
              </motion.div> : <span className="scout-placeholder" aria-label="Looking for another person" />}
            </div>;
          })}
        </div>
        <aside className="scout-action-panel" aria-label="Your twin’s actions">
          <span className="scout-eyebrow">BEHIND THE HELLO</span>
          <h3>{activity.completed ? "Room for a real connection." : "Small steps. Common ground."}</h3>
          <ol className="scout-steps">
            <li data-active={!activity.activeId && !activity.completed}><Search size={16} /><span>Discover people<small>{activity.discovered.size} of {activity.target || 9} discovered</small></span></li>
            <li data-active={!!activity.activeId}><MessageCircle size={16} /><span>Let twins talk<small>{activity.finished.size} conversations saved</small></span></li>
            <li data-active={activity.completed}><Sparkles size={16} /><span>Find the overlap<small>{run?.qualifiedCount ?? 0} new possibilities</small></span></li>
          </ol>
          <div className="scout-conversation">
            <span>{message?.speaker === "candidate_twin" ? `${messagePerson?.name.split(" ")[0] ?? "Their"}’s twin` : "Your twin"}</span>
              <motion.p key={message?.id ?? "preparing"} initial={{ opacity: .65, y: 3 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .12 }}>
                {message?.text ?? "Preparing your approved interests and conference intention. The first conversation will appear here."}
              </motion.p>
            <small>Fictional attendees · seeded demo conversations</small>
          </div>
        </aside>
      </div>
      <div className="scout-progress" role="progressbar" aria-label="Scouting progress" aria-valuenow={activity.progress} aria-valuemin={0} aria-valuemax={100}>
        <motion.span initial={{ width: 0 }} animate={{ width: `${activity.progress}%` }} transition={{ duration: .4 }} />
      </div>
      <footer className="scout-footer">
        <span><ShieldCheck size={14} /> Only approved details. You choose whom to meet.</span>
        <button className="btn btn-primary" onClick={error || activity.failed ? onRetry : onClose}>
          {error || activity.failed ? "Try scouting again" : activity.completed ? "See your circle" : "Continue in background"}<ArrowRight size={15} />
        </button>
      </footer>
    </div>
  </Dialog>;
}
