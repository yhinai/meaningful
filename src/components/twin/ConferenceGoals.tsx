"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowRight,
  Check,
  Compass,
  LoaderCircle,
  Send,
  Sparkles,
} from "lucide-react";
import type { ConferenceGoals } from "@/lib/types";
import "./twin.css";

const categories = [
  "Cofounder",
  "Investor",
  "Customer",
  "Mentor",
  "Hire",
  "Collaborator",
  "Learn",
  "Community",
];
const questions = [
  "What do you want to achieve at this conference?",
  "What industry and stage should I focus on?",
  "What would make a conversation worthwhile for you?",
];
export default function GoalsInterview() {
  const [goals, setGoals] = useState<ConferenceGoals>({
    text: "",
    categories: [],
    industry: "",
    stage: "",
    outcome: "",
  });
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    fetch("/api/events/evt_demo/goals")
      .then(async (response) => {
        if (!response.ok) throw new Error("Your goals could not be loaded.");
        const data: ConferenceGoals = await response.json();
        setGoals(data);
        setInput(data.text);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);
  function chooseCategory(category: string) {
    setGoals((previous) => ({
      ...previous,
      categories: previous.categories.includes(category)
        ? previous.categories.filter((item) => item !== category)
        : [...previous.categories, category],
    }));
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!input.trim() || saving) return;
    const responseText = input.trim();
    const nextGoals = {
      ...goals,
      ...(step === 0
        ? { text: responseText }
        : step === 1
          ? { industry: responseText }
          : { outcome: responseText }),
    };
    if (step < 2) {
      setGoals(nextGoals);
      setAnswers((previous) => [...previous, responseText]);
      setStep((previous) => previous + 1);
      setInput(
        step === 0
          ? [goals.industry, goals.stage].filter(Boolean).join(" · ")
          : goals.outcome,
      );
      return;
    }
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/events/evt_demo/goals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextGoals),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(
          data.error || "Could not save your goals. Please try again.",
        );
      }
      setGoals(await response.json());
      setAnswers((previous) => [...previous, responseText]);
      setInput("");
      setComplete(true);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not save. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="twin-page">
      <div className="twin-title-row">
        <div>
          <div className="twin-eyebrow">
            <Compass size={13} /> Conference goals
          </div>
          <h1>What brings you here?</h1>
          <p className="twin-subtitle">
            Tell your twin what you hope to find. Three short answers will give
            it a clear direction.
          </p>
        </div>
      </div>
      <section className="twin-card twin-chat">
        <div className="twin-eyebrow">
          <Sparkles size={13} /> Your twin · Conference goals
        </div>
        {loading ? (
          <div className="twin-loading">Preparing your conversation…</div>
        ) : (
          <>
            <AnimatePresence initial={false}>
              {questions
                .slice(0, Math.min(step + 1, 3))
                .map((question, index) => (
                  <motion.div
                    key={question}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35 }}
                  >
                    <div className="twin-chat-bubble">
                      <div className="twin-chat-icon">
                        <Sparkles size={17} />
                      </div>
                      <div className="twin-chat-copy">{question}</div>
                    </div>
                    {answers[index] && (
                      <div className="twin-chat-bubble user">
                        <div className="twin-chat-copy">{answers[index]}</div>
                      </div>
                    )}
                  </motion.div>
                ))}
            </AnimatePresence>
            {step === 0 && !complete && (
              <div style={{ marginLeft: 48 }}>
                <div className="twin-chips">
                  {categories.map((category) => (
                    <button
                      type="button"
                      aria-pressed={goals.categories.includes(category)}
                      className={`twin-chip selectable ${goals.categories.includes(category) ? "selected" : ""}`}
                      key={category}
                      onClick={() => chooseCategory(category)}
                    >
                      {goals.categories.includes(category) && (
                        <Check size={12} />
                      )}
                      {category}
                    </button>
                  ))}
                </div>
                <p className="twin-goal-context">
                  Choose a few that feel right, then tell me a little more
                  below.
                </p>
              </div>
            )}
            {error && (
              <div className="twin-alert error" role="alert">
                {error}
              </div>
            )}
            {complete ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="twin-chat-bubble">
                  <div className="twin-chat-icon">
                    <Check size={17} />
                  </div>
                  <div className="twin-chat-copy">
                    I have a clear direction. I will look for people whose
                    experience and intentions complement yours. You choose which
                    connections to take forward.
                  </div>
                </div>
                <div className="twin-actions">
                  <button
                    className="twin-button text"
                    onClick={() => {
                      setStep(0);
                      setAnswers([]);
                      setInput(goals.text);
                      setComplete(false);
                    }}
                  >
                    Edit my goals
                  </button>
                  <Link
                    className="twin-button primary"
                    href="/event/evt_demo/network"
                  >
                    Explore my network <ArrowRight size={14} />
                  </Link>
                </div>
              </motion.div>
            ) : (
              <form onSubmit={submit}>
                <div className="twin-chat-compose">
                  <input
                    aria-label={questions[step]}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    maxLength={step === 0 ? 2000 : step === 1 ? 150 : 1000}
                    placeholder={
                      step === 0
                        ? "I would love to meet…"
                        : step === 1
                          ? "An industry, a stage, a space you care about…"
                          : "A great outcome would be…"
                    }
                  />
                  <button
                    type="submit"
                    aria-label={
                      step === 2 ? "Save conference goals" : "Send answer"
                    }
                    disabled={!input.trim() || saving}
                  >
                    {saving ? (
                      <LoaderCircle size={17} className="twin-saving" />
                    ) : (
                      <Send size={17} />
                    )}
                  </button>
                </div>
                <div className="twin-goal-context">
                  <span>{step + 1} of 3</span>
                  <span>·</span>
                  <span>
                    These goals stay separate from your permanent profile.
                  </span>
                </div>
              </form>
            )}
          </>
        )}
      </section>
    </div>
  );
}
