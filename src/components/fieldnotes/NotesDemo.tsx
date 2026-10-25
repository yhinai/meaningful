"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  Check,
  LoaderCircle,
  Mic,
  Play,
  RotateCcw,
} from "lucide-react";
import { demoConversation } from "@/features/fieldnotes/demo";

export default function NotesDemo({
  onStart,
  onComplete,
}: {
  onStart: () => void;
  onComplete: () => void;
}) {
  const [stage, setStage] = useState<
    "idle" | "talking" | "generating" | "ready"
  >("idle");
  const [progress, setProgress] = useState(0);
  const turn = Math.floor(progress / 100);
  const transcript = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (stage === "talking" && transcript.current)
      transcript.current.scrollTop = transcript.current.scrollHeight;
  }, [progress, stage]);
  useEffect(() => {
    if (stage === "talking") {
      const timer = setInterval(
        () => setProgress((value) => Math.min(value + 4, 400)),
        100,
      );
      return () => clearInterval(timer);
    }
    if (stage === "generating") {
      const timer = setTimeout(() => {
        setStage("ready");
        onComplete();
      }, 3200);
      return () => clearTimeout(timer);
    }
  }, [stage, onComplete]);
  useEffect(() => {
    if (progress >= 400 && stage === "talking") setStage("generating");
  }, [progress, stage]);
  function start() {
    onStart();
    setProgress(0);
    setStage("talking");
  }
  function finish() {
    setProgress(400);
    setStage("ready");
    onComplete();
  }
  return (
    <section className="mn-demo" aria-label="Meaningful Notes demo">
      <div className="mn-demo-heading">
        <span className="fn-kicker">
          INTERACTIVE DEMO · FICTIONAL CONVERSATION
        </span>
        <span className="mn-demo-offline">No device or API key needed</span>
      </div>
      <h2>
        {stage === "idle"
          ? "From a hello to your own magazine."
          : stage === "talking"
            ? "A conversation worth keeping."
            : stage === "generating"
              ? "Finding the story in your words…"
              : "Your conversation, rediscovered."}
      </h2>
      <p>
        {stage === "idle"
          ? "Watch two people talk, see their words appear, then turn the conversation into a personal edition."
          : stage === "talking"
            ? "Simulating live transcription. Words appear as each person speaks."
            : stage === "generating"
              ? "Simulating the editor: connecting ideas, checking passages, and gathering next steps."
              : "Your sample magazine is ready on its own page, with photos, stories, citations, and next steps."}
      </p>
      <ol className="mn-demo-steps" aria-label="Demo progress">
        {["Conversation", "Making your magazine", "Your edition"].map(
          (label, index) => (
            <li
              key={label}
              className={
                (stage === "talking" && index === 0) ||
                (stage === "generating" && index === 1) ||
                (stage === "ready" && index === 2)
                  ? "active"
                  : ""
              }
            >
              <span>{index + 1}</span>
              {label}
            </li>
          ),
        )}
      </ol>
      {stage !== "idle" && (
        <div
          className="mn-demo-conversation"
          ref={transcript}
          role="log"
          aria-label="Simulated conversation"
          aria-live="off"
        >
          {demoConversation.map((item, index) => {
            if (stage === "talking" && index > turn) return null;
            const speaking = stage === "talking" && index === turn;
            const text = speaking
              ? item.text.slice(
                  0,
                  Math.ceil((item.text.length * (progress % 100)) / 100),
                )
              : item.text;
            return (
              <article
                key={item.id}
                className={item.speaker === "You" ? "is-you" : ""}
              >
                <span className="mn-speaker-avatar">{item.initials}</span>
                <div>
                  <strong>
                    {item.speaker}
                    {speaking && (
                      <span className="mn-speaking">
                        <i />
                        <i />
                        <i />
                        <Mic size={11} />
                      </span>
                    )}
                  </strong>
                  <p>
                    {text || "…"}
                    {speaking && <span className="mn-caret" />}
                  </p>
                  <small>
                    {speaking ? "Speaking · live draft" : "Finalized passage"}
                  </small>
                </div>
              </article>
            );
          })}
        </div>
      )}
      {stage === "generating" && (
        <div className="mn-demo-generating" role="status">
          <LoaderCircle size={19} className="fn-spin" />
          <span>
            Reading the transcript
            <br />
            <small>
              Finding themes → linking sources → composing your edition
            </small>
          </span>
        </div>
      )}
      {stage === "ready" && (
        <p className="mn-demo-ready" role="status">
          <Check size={16} /> Your sample edition is ready. Open your magazine
          to read it.
        </p>
      )}
      <div className="mn-demo-actions">
        {stage === "ready" && (
          <Link className="fn-button" href="/meaningful-notes/demo/magazine">
            <BookOpen size={15} /> Open your magazine
          </Link>
        )}
        {stage === "idle" || stage === "ready" ? (
          <button className="fn-button" onClick={start}>
            {stage === "ready" ? <RotateCcw size={15} /> : <Play size={15} />}
            {stage === "ready" ? "Replay demo" : "Play demo"}
          </button>
        ) : (
          <button className="fn-button fn-secondary" onClick={finish}>
            <BookOpen size={15} /> Skip to magazine
          </button>
        )}
        {stage === "idle" && (
          <Link className="mn-demo-skip" href="/meaningful-notes/demo/magazine">
            Preview the magazine
          </Link>
        )}
      </div>
      <p className="fn-small">
        Demo only. Simulated captions and a prepared sample edition; no audio is
        recorded, no AI service is called, and your real notes stay separate.
      </p>
    </section>
  );
}
