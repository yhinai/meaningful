"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, BookOpen, Play } from "lucide-react";
import type { DemoState } from "@/lib/types";
import { deriveConnections } from "@/components/connections/model";
import { fieldnotesPath } from "@/features/fieldnotes/paths";
import "./fieldnotes.css";

export default function NotesHome() {
  const [state, setState] = useState<DemoState | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/demo/state", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw Error();
        return response.json();
      })
      .then(setState)
      .catch(() => {
        if (!controller.signal.aborted)
          setError(
            "Your connections couldn’t load. You can still try the demo.",
          );
      });
    return () => controller.abort();
  }, []);
  const connections = state
    ? deriveConnections(state).filter(
        (connection) =>
          connection.meeting && ["ready", "met"].includes(connection.status),
      )
    : [];
  return (
    <div className="fieldnotes mn-home">
      <div className="fn-top">
        <Link href="/">
          <ArrowLeft size={14} /> Home
        </Link>
        <span>CONVERSATIONS WORTH KEEPING</span>
      </div>
      <header className="mn-home-heading">
        <span className="fn-kicker">AFTER THE HELLO</span>
        <h1>
          Meaningful Notes<span>.</span>
        </h1>
        <p>
          The ideas that stay. The stories worth revisiting.
          <br />
          Your conversations, turned into something to keep.
        </p>
      </header>
      <section className="mn-home-demo">
        <div>
          <span className="fn-kicker">SEE IT COME TO LIFE</span>
          <h2>
            A conversation.
            <br />
            <em>A personal magazine.</em>
          </h2>
          <p>
            Try the complete experience: two people talking, live words
            appearing, and a magazine coming together. Works even when Omi or
            the editor is unavailable.
          </p>
          <Link className="fn-button" href="/meaningful-notes/demo">
            <Play size={15} /> Try the demo <ArrowUpRight size={15} />
          </Link>
          <small>Illustrative conversation · no setup needed</small>
        </div>
        <div className="mn-magazine-preview" aria-hidden="true">
          <span>Meaningful Notes.</span>
          <small>A PERSONAL EDITION</small>
          <BookOpen size={38} strokeWidth={1} />
          <p>
            Better questions.
            <br />
            <em>More human answers.</em>
          </p>
          <div>THE IDEAS · THE MOMENT · WHAT’S NEXT</div>
        </div>
      </section>
      <section className="mn-home-journals">
        <div className="fn-section-heading">
          <h2>Your conversations.</h2>
          <span>YOUR PRIVATE NOTES</span>
        </div>
        {error && (
          <p role="status" className="fn-small">
            {error}
          </p>
        )}
        {connections.length ? (
          connections.map((connection) => (
            <Link
              className="mn-journal-link"
              key={connection.meeting!.id}
              href={fieldnotesPath(
                connection.meeting!.eventId,
                connection.meeting!.id,
              )}
            >
              <BookOpen size={20} strokeWidth={1.2} />
              <span>
                <strong>{connection.person.name}</strong>
                <small>
                  {connection.status === "met"
                    ? "Keep the moment. Read or make your edition."
                    : "Save notes or listen with Omi during your conversation."}
                </small>
              </span>
              <ArrowUpRight size={16} />
            </Link>
          ))
        ) : (
          <div className="mn-home-empty">
            <BookOpen size={24} strokeWidth={1.2} />
            <p>
              {state
                ? "Your next meaningful hello starts a new chapter."
                : error
                  ? "Your demo is always available above."
                  : "Finding your conversations…"}
            </p>
            <Link href="/event/evt_demo/network">
              Back to your people <ArrowUpRight size={13} />
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
