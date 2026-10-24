"use client";

import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, Check, Coffee, Sparkles } from "lucide-react";
import Link from "next/link";

export default function PointsCelebration({
  eventId,
  name,
  points,
  onClose,
}: {
  eventId: string;
  name: string;
  points: number;
  onClose?: () => void;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.section
      className="ft-celebration"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <div className="ft-celebration-mark">
        <motion.span
          initial={{ scale: 0.6 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 150, damping: 12 }}
        >
          <Check size={35} strokeWidth={1.3} />
        </motion.span>
        {!reduce &&
          Array.from({ length: 8 }, (_, i) => (
            <motion.i
              key={i}
              initial={{ opacity: 0, rotate: i * 45, y: 0 }}
              animate={{ opacity: [0, 0.8, 0], y: -70, rotate: i * 45 + 30 }}
              transition={{ duration: 1.6, delay: i * 0.06 }}
              style={{ left: `${15 + i * 10}%` }}
            />
          ))}
      </div>
      <span className="ft-kicker">FROM A MATCH TO A MOMENT</span>
      <h2>
        A real connection.
        <br />A meaningful beginning.
      </h2>
      <p>
        You and {name} both confirmed your hello.
        <br />
        Here’s to what comes next.
      </p>
      {points > 0 && (
        <div className="ft-xp-award">
          <Sparkles size={17} strokeWidth={1.4} />
          <strong>+{points} XP</strong>
          <span>Meeting completed</span>
        </div>
      )}
      {points > 0 && (
        <div className="ft-demo-reward">
          <Coffee size={21} strokeWidth={1.4} />
          <div>
            <span>DEMO REWARD UNLOCKED</span>
            <strong>A coffee, on Common Ground.</strong>
            <p>
              Fictional coffee voucher · simulated reward only.
              <br />
              No purchase, email, or real redemption.
            </p>
          </div>
        </div>
      )}
      {onClose ? (
        <button className="ft-primary-action" onClick={onClose}>
          Back to your people <ArrowRight size={15} />
        </button>
      ) : (
        <Link
          href={`/event/${encodeURIComponent(eventId)}/matches`}
          className="ft-primary-action"
        >
          Your people <ArrowRight size={15} />
        </Link>
      )}
      <small className="ft-completion-note">
        Both confirmations are saved. Points are awarded once.
      </small>
    </motion.section>
  );
}
