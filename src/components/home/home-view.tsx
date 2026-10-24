"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  MapPin,
  ChevronDown,
} from "lucide-react";
import type { ConferenceGoals, DemoState } from "@/lib/types";
import { defaultGoals } from "@/lib/fixtures";
import TwinCharacter from "@/components/twin-character/TwinCharacter";
import "./home.css";

const intentions = [
  {
    category: "Cofounder",
    label: "Find a cofounder",
    goal: "Find a technical cofounder for an AI agent startup.",
  },
  {
    category: "Collaborator",
    label: "Meet collaborators",
    goal: "Meet collaborators building thoughtful AI products.",
  },
  {
    category: "Investor",
    label: "Connect with investors",
    goal: "Meet early-stage investors interested in AI products.",
  },
  {
    category: "Community",
    label: "Explore new ideas",
    goal: "Meet curious people to exchange ideas about AI and design.",
  },
];

export default function HomeView() {
  const router = useRouter();
  const [state, setState] = useState<DemoState | null>(null);
  const [goal, setGoal] = useState(defaultGoals.text);
  const [category, setCategory] = useState("Cofounder");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    fetch("/api/demo/state", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok)
          throw Error(
            "We couldn’t load your conference. Please refresh to reconnect.",
          );
        return response.json() as Promise<DemoState>;
      })
      .then((next) => {
        if (!alive) return;
        setState(next);
        setGoal(next.goals.text);
        setCategory(next.goals.categories[0] || "Cofounder");
      })
      .catch((e) => {
        if (alive) setError(e.message);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  async function startConference() {
    if (busy || loading) return;
    setBusy(true);
    setError("");
    try {
      const goals: ConferenceGoals = {
        ...(state?.goals ?? defaultGoals),
        text: goal.trim(),
        categories: [category],
      };
      const saved = await fetch("/api/events/evt_demo/goals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(goals),
      });
      if (!saved.ok)
        throw Error("Your intention couldn’t be saved. Please try again.");
      if (
        !state?.runs.length ||
        state.goals.text.trim() !== goal.trim() ||
        state.goals.categories[0] !== category
      ) {
        const run = await fetch("/api/demo/action", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "start-run" }),
        });
        const result = await run.json();
        if (!run.ok)
          throw Error(
            result.error || "Your twin couldn’t start. Please try again.",
          );
      }
      router.push("/event/evt_demo/network");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
      setBusy(false);
    }
  }

  return (
    <div className="conference-welcome">
      <motion.div
        className="welcome-twin-scene"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="welcome-twin-halo" aria-hidden="true" />
        <div className="welcome-twin-character">
          <TwinCharacter size={180} mood="idle" interactive personId={state?.activeUserId ?? "usr_self"} />
        </div>
        <span className="welcome-twin-caption">
          Your twin. A little more you.
        </span>
      </motion.div>
      <motion.section
        className="welcome-conference-content"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
      >
        <span className="welcome-eyebrow">
          MAKE ROOM FOR A MEANINGFUL HELLO
        </span>
        <h1>
          A whole conference.
          <br />A few who matter.
        </h1>
        <p className="welcome-intro">
          Your twin finds the common ground.
          <br />
          You make the connection.
        </p>
        <div className="welcome-event-card">
          <span className="welcome-event-monogram">
            S<span>26</span>
          </span>
          <div>
            <h2>SF AI Summit</h2>
            <p>
              <span>
                <CalendarDays size={12} />
                October 24–26, 2026
              </span>
              <span>
                <MapPin size={12} />
                San Francisco
              </span>
            </p>
          </div>
          <span className="welcome-event-selected">
            <i />
            Your conference
          </span>
        </div>
        <details className="welcome-intention">
          <summary>
            <span>
              <small>YOUR INTENTION</small>
              <strong>{goal}</strong>
            </span>
            <ChevronDown size={15} />
          </summary>
          <div className="welcome-intention-edit">
            <fieldset>
              <legend>What would make this conference meaningful?</legend>
              {intentions.map((item) => (
                <label
                  key={item.category}
                  className={category === item.category ? "selected" : ""}
                >
                  <input
                    type="radio"
                    name="conference-intention-category"
                    value={item.category}
                    checked={category === item.category}
                    onChange={() => {
                      setCategory(item.category);
                      setGoal(item.goal);
                    }}
                  />
                  {item.label}
                </label>
              ))}
            </fieldset>
            <label className="sr-only" htmlFor="welcome-goal">
              Your conference goal
            </label>
            <textarea
              id="welcome-goal"
              maxLength={1000}
              rows={3}
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
            />
          </div>
        </details>
        {error && (
          <p className="welcome-error" role="alert">
            {error}
            <Link href="/twin/train">
              Review your twin <ArrowUpRight size={12} />
            </Link>
          </p>
        )}
        <button
          className="welcome-start"
          disabled={loading || busy || !goal.trim()}
          onClick={startConference}
        >
          {busy
            ? "Opening your conference…"
            : loading
              ? "Getting ready…"
              : "Start conference"}
          <ArrowRight size={17} />
        </button>
        <p className="welcome-choice">
          Your twin connects. You always choose whom to meet.
        </p>
        <Link href="/twin/train" className="welcome-training-link">
          Make your twin more you <ArrowUpRight size={12} />
        </Link>
      </motion.section>
    </div>
  );
}
