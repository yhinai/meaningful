"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Activity,
  ArrowRight,
  ChevronRight,
  List,
  LoaderCircle,
  MessageCircle,
  Network,
  Play,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import type { DemoState } from "@/lib/types";
import OrbitalGraph from "./graph";
import { previewPeople, withPortrait, type GraphPerson } from "./people";
import "./network.css";
export function NetworkPreview({
  onClick,
  className = "",
  state,
}: {
  onClick?: () => void;
  className?: string;
  state?: DemoState | null;
}) {
  const run = state?.runs.at(-1);
  const events = run?.events ?? [];
  const active = new Set<string>();
  events.forEach((e) => {
    const id = String(e.payload.candidate_id || "");
    if (e.type === "negotiation.started") active.add(id);
    if (e.type === "negotiation.completed") active.delete(id);
  });
  const qualified = events
    .filter((e) => e.type === "match.qualified")
    .map((e) => String(e.payload.candidate_id));
  return (
    <div className={`mm-network-preview ${className}`} onClick={onClick}>
      <OrbitalGraph
        compact
        people={
          run
            ? (state?.candidates ?? [])
                .filter((p) =>
                  events.some(
                    (e) =>
                      e.type === "candidate.discovered" &&
                      e.payload.candidate_id === p.id,
                  ),
                )
                .map(withPortrait)
            : previewPeople
        }
        activeIds={[...active]}
        qualifiedIds={qualified}
      />
    </div>
  );
}
export default function NetworkView() {
  const [state, setState] = useState<DemoState | null>(null);
  const [selected, setSelected] = useState<GraphPerson | null>(null);
  const [filter, setFilter] = useState("All");
  const [list, setList] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [replay, setReplay] = useState<number | null>(null);
  const refresh = useCallback(async () => {
    const response = await fetch("/api/demo/state", { cache: "no-store" });
    if (!response.ok)
      throw new Error("Your network could not be loaded. Please try again.");
    const next = (await response.json()) as DemoState;
    setState(next);
    return next;
  }, []);
  useEffect(() => {
    refresh().catch((e) => setError(e.message));
  }, [refresh]);
  const run = state?.runs
    .filter((r) => r.ownerUserId === state.activeUserId)
    .at(-1);
  const running = run?.status === "running";
  useEffect(() => {
    if (!running || !run) return;
    let pending: ReturnType<typeof setTimeout> | undefined;
    const source = new EventSource(
      `/api/events/evt_demo/twin-runs/${run.id}/stream?lastSeq=${run.events.length}`,
    );
    source.onmessage = () => {
      if (pending) clearTimeout(pending);
      pending = setTimeout(
        () =>
          refresh().catch(() =>
            setError("Connection interrupted. Reconnecting to your saved run…"),
          ),
        120,
      );
    };
    source.onerror = () => {
      refresh().catch(() =>
        setError("Connection interrupted. Reconnecting to your saved run…"),
      );
    };
    const timer = setInterval(
      () =>
        refresh().catch(() =>
          setError("Connection interrupted. Reconnecting to your saved run…"),
        ),
      4000,
    );
    return () => {
      source.close();
      clearInterval(timer);
      if (pending) clearTimeout(pending);
    };
  }, [run?.id, running, refresh]);
  const people = useMemo(
    () => state?.candidates.map(withPortrait) || previewPeople,
    [state?.candidates],
  );
  const events = replay === null ? run?.events : run?.events.slice(0, replay);
  const activeIds = useMemo(() => {
    const active = new Set<string>();
    events?.forEach((e) => {
      const id = String(e.payload.candidate_id || "");
      if (e.type === "negotiation.started") active.add(id);
      if (e.type === "negotiation.completed" || e.type === "match.scored")
        active.delete(id);
    });
    return [...active];
  }, [events]);
  const qualifiedIds = useMemo(
    () =>
      events
        ?.filter((e) => e.type === "match.qualified")
        .map((e) => String(e.payload.candidate_id)) || [],
    [events],
  );
  const acceptedIds = useMemo(
    () =>
      events
        ?.filter((e) => e.type === "meeting.accepted")
        .map((e) => String(e.payload.candidate_id)) || [],
    [events],
  );
  const rejectedIds = useMemo(
    () =>
      events
        ?.filter((e) => e.type === "match.rejected")
        .map((e) => String(e.payload.candidate_id)) || [],
    [events],
  );
  const discovered =
    replay === null
      ? run?.discoveredCount || 0
      : events?.filter((e) => e.type === "candidate.discovered").length || 0;
  const visiblePeople = run
    ? people.filter((p) =>
        events?.some(
          (e) =>
            e.type === "candidate.discovered" &&
            e.payload.candidate_id === p.id,
        ),
      )
    : people;
  const filteredPeople = visiblePeople.filter((p) =>
    filter === "Talking"
      ? activeIds.includes(p.id)
      : filter === "Matches"
        ? qualifiedIds.includes(p.id) || acceptedIds.includes(p.id)
        : true,
  );
  const person = selected || people[0];
  const ranking = run?.rankings.find((r) => r.candidateId === person.id);
  const messages =
    run?.messages.filter((m) => m.candidateId === person.id) || [];
  const latestEvent = events?.at(-1);
  const phase = run
    ? running
      ? "Your twin is making connections"
      : run.status === "failed"
        ? "Your twin needs a moment"
        : "Your possibilities, discovered"
    : "A world of possibility awaits";
  async function start() {
    setBusy(true);
    setError("");
    setReplay(null);
    try {
      const response = await fetch("/api/demo/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start-run" }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Could not start scouting.");
      setState(result);
      setSelected(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="mm-network-page">
      <div className="mm-network-title">
        <div>
          <h1>Your network.</h1>
          <p>Your twin finds the people worth meeting.</p>
        </div>
        <button
          className="mm-network-start"
          onClick={start}
          disabled={busy || running}
        >
          {busy || running ? (
            <LoaderCircle size={17} className="mm-spin" />
          ) : (
            <Sparkles size={17} />
          )}{" "}
          {running
            ? "Your twin is scouting"
            : run
              ? "Scout again"
              : "Start scouting"}
          {!running && <ArrowRight size={16} />}
        </button>
      </div>
      {error && (
        <div className="mm-network-error" role="alert">
          {error}
          <button
            onClick={() => {
              setError("");
              refresh().catch((e) => setError(e.message));
            }}
          >
            Reconnect <RefreshCw size={14} />
          </button>
        </div>
      )}
      <div className="mm-network-workspace">
        <section className="mm-network-canvas">
          <div className="mm-canvas-toolbar">
            <div className="mm-network-filters">
              {["All", "Talking", "Matches"].map((f) => (
                <button
                  key={f}
                  className={filter === f ? "active" : ""}
                  onClick={() => setFilter(f)}
                >
                  {f}
                  {f === "All" && <span>{run ? discovered : 20}</span>}
                </button>
              ))}
            </div>
            <div className="mm-canvas-actions">
              <button
                title={list ? "Show graph" : "Accessible list view"}
                aria-label={list ? "Show graph" : "Accessible list view"}
                onClick={() => setList(!list)}
              >
                {list ? <Network size={17} /> : <List size={17} />}
              </button>
            </div>
          </div>
          <div className="mm-full-graph">
            {list ? (
              <div className="mm-network-list">
                {filteredPeople.map((p) => (
                  <button key={p.id} onClick={() => setSelected(p)}>
                    <img src={p.avatar} alt="" />
                    <span>
                      <strong>{p.name}</strong>
                      <small>
                        {p.role} · {p.company}
                      </small>
                    </span>
                    <ChevronRight size={16} />
                  </button>
                ))}
                {filteredPeople.length === 0 && (
                  <p className="mm-network-empty">
                    {filter === "Talking"
                      ? "No conversations in progress."
                      : filter === "Matches"
                        ? "Your matches will appear after the twin conversations."
                        : "Your twin is discovering people."}
                  </p>
                )}
              </div>
            ) : (
              <OrbitalGraph
                people={visiblePeople}
                selectedId={selected?.id}
                onSelect={setSelected}
                activeIds={activeIds}
                qualifiedIds={qualifiedIds}
                acceptedIds={acceptedIds}
                rejectedIds={rejectedIds}
                filter={filter}
              />
            )}
            {!list && filteredPeople.length === 0 && filter !== "All" && (
              <div className="mm-network-empty graph-empty">
                {filter === "Talking"
                  ? "No conversations in progress."
                  : "Your matches will appear after the twin conversations."}
              </div>
            )}
            <div className="mm-graph-key">
              <span>
                <i className="self" />
                Your twin
              </span>
              <span>
                <i className="candidate" />
                Discovered
              </span>
              <span>
                <i className="talking" />
                In conversation
              </span>
              <span>
                <i className="qualified" />A meaningful fit
              </span>
            </div>
          </div>
          <div className="mm-run-status">
            <div className="mm-run-icon">
              {running ? <Activity size={19} /> : <Sparkles size={19} />}
            </div>
            <div>
              <strong>{phase}</strong>
              <span>
                {running
                  ? `${discovered} people discovered · ${run.conversationCount} conversations completed`
                  : run
                    ? `${run.discoveredCount} people discovered · ${run.qualifiedCount} meaningful fits`
                    : "20 thoughtfully selected people. Three conversations to begin."}
              </span>
            </div>
            {running && (
              <div className="mm-working-dots">
                <i />
                <i />
                <i />
              </div>
            )}
            {!run && <span className="mm-demo-pill">Demo preview</span>}
          </div>
          {run && (
            <details
              className="mm-replay"
              onToggle={(e) => {
                if (!e.currentTarget.open) setReplay(null);
              }}
            >
              <summary>
                <RotateCcw size={13} />
                Replay activity
              </summary>
              <div className="mm-timeline">
                <span>{replay === null ? "Latest" : "Demo replay"}</span>
                <input
                  type="range"
                  aria-label="Replay saved workflow events"
                  min="0"
                  max={run.events.length}
                  value={replay ?? run.events.length}
                  onChange={(e) => setReplay(Number(e.target.value))}
                />
                <small>
                  {latestEvent?.type.replaceAll(".", " ") || "Run started"}
                </small>
                {replay !== null && (
                  <button className="live" onClick={() => setReplay(null)}>
                    <Play size={12} />
                    Resume live
                  </button>
                )}
              </div>
            </details>
          )}
        </section>
        <aside className="mm-network-inspector">
          <div className="mm-inspector-heading">
            <span>{selected ? "Connection" : "Meet someone new"}</span>
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={person.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.24 }}
            >
              <div className="mm-inspector-person">
                <img src={person.avatar} alt={person.name} />
                <span className="mm-inspector-open">
                  <i />
                  Open to connect
                </span>
                <h2>{person.name}</h2>
                <p>
                  {person.role} <span>at {person.company}</span>
                </p>
                <div className="mm-person-topics">
                  {person.topics.slice(0, 2).map((t) => (
                    <span key={t}>{t}</span>
                  ))}
                </div>
              </div>
              <div className="mm-inspector-bio">
                <h3>About</h3>
                <p>
                  {person.bio ||
                    `Exploring new possibilities at the intersection of ${person.topics.join(" and ")}. Open to thoughtful conversations.`}
                </p>
              </div>
              <div className="mm-inspector-why">
                <span>Why you might connect</span>
                <p>
                  {ranking?.reasons[0] ||
                    "Complementary perspectives. Shared curiosity. The beginning of something worth exploring."}
                </p>
                {ranking && (
                  <details>
                    <summary>
                      View evidence <ChevronRight size={14} />
                    </summary>
                    {ranking.evidencePaths.map((path, i) => (
                      <p key={i} className="mm-evidence-path">
                        {path}
                      </p>
                    ))}
                    <small>
                      Provisional ranking: {ranking.score}/100. Confirmed only
                      after twin discussion.
                    </small>
                  </details>
                )}
              </div>
              <div className="mm-dialogue">
                <div className="mm-dialogue-title">
                  <h3>
                    <MessageCircle size={16} />
                    Twin conversation
                  </h3>
                  {messages.length > 0 && <span>Seeded replay</span>}
                </div>
                {messages.length > 0 ? (
                  <div className="mm-dialogue-messages">
                    {messages
                      .filter(
                        (m) =>
                          replay === null ||
                          events?.some(
                            (e) =>
                              e.type === "twin.message" &&
                              e.payload.text === m.text,
                          ),
                      )
                      .map((m) => (
                        <motion.div
                          key={m.id}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={
                            m.speaker === "your_twin" ? "yours" : "theirs"
                          }
                        >
                          <small>
                            {m.speaker === "your_twin"
                              ? "Your twin"
                              : `${person.name.split(" ")[0]}’s twin`}
                          </small>
                          <p>{m.text}</p>
                        </motion.div>
                      ))}
                  </div>
                ) : (
                  <div className="mm-dialogue-empty">
                    <span>
                      <Sparkles size={20} />
                    </span>
                    <p>
                      {run
                        ? "Your twin will speak with the three highest-ranked people."
                        : "A thoughtful conversation is on the horizon."}
                    </p>
                    <small>Only information you approve is shared.</small>
                  </div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
          <div className="mm-inspector-footer">
            <ShieldCheck size={15} />
            <span>Your twin connects. You choose.</span>
          </div>
          {qualifiedIds.includes(person.id) && (
            <Link href="/event/evt_demo/matches" className="mm-inspector-match">
              Explore your match <ArrowRight size={16} />
            </Link>
          )}
        </aside>
      </div>
      <div className="mm-network-bottom-note">
        <span>Demo · 20 fictional attendees. Scripted twin conversations.</span>
        <details>
          <summary>About this demo</summary>
          <p>
            Every fictional attendee has opted in. Moving lines show active
            scripted conversations. Scores are heuristics, not probabilities.
            Both people must approve an introduction.
          </p>
        </details>
      </div>
    </div>
  );
}
