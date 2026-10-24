"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  ChevronDown,
  List,
  LoaderCircle,
  Network,
  RefreshCw,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import type { DemoState } from "@/lib/types";
import OrbitalGraph from "@/components/network/graph";
import { deriveConferenceCircle } from "./graph-state";
import "./stage.css";
import { PersonAvatar } from "@/components/ui/avatar";
import { personFor } from "@/components/connections/model";

export type ConferenceGraphStageProps = {
  state: DemoState | null;
  onPersonSelect: (personId: string) => void;
  onTwinSelect?: () => void;
  onStart: () => void;
  busy?: boolean;
  error?: string;
  onRetry?: () => void;
};

type CircleFilter = "All" | "Talking" | "Matches";

/** A view of persisted workflow activity. The parent owns all network requests. */
export default function ConferenceGraphStage({
  state,
  onPersonSelect,
  onTwinSelect,
  onStart,
  busy = false,
  error,
  onRetry,
}: ConferenceGraphStageProps) {
  const [filter, setFilter] = useState<CircleFilter>("All");
  const [communityView, setCommunityView] = useState(false);
  const [listView, setListView] = useState(false);
  const [replay, setReplay] = useState<number | null>(null);
  const run = state?.runs
    .filter((item) => item.ownerUserId === state.activeUserId)
    .at(-1);
  const running = run?.status === "running";
  const events = useMemo(
    () =>
      replay === null
        ? (run?.events ?? [])
        : (run?.events.slice(0, replay) ?? []),
    [run?.events, replay],
  );
  const circle = useMemo(
    () => deriveConferenceCircle(state, events, replay === null),
    [state, events, replay],
  );
  useEffect(() => {
    setReplay(null);
  }, [run?.id, state?.activeUserId]);

  const readyIds = new Set([
    ...circle.qualified,
    ...circle.accepted,
    ...circle.completed,
  ]);
  const availablePeople =
    communityView && replay === null ? circle.community : circle.people;
  // Keep active conversations and approved meetings alongside the latest finds.
  const priorityIds = new Set([
    ...circle.active,
    ...circle.accepted,
    ...circle.completed,
  ]);
  const shownIds = new Set([
    ...availablePeople.filter((person) => priorityIds.has(person.id)),
    ...availablePeople.slice().reverse(),
  ].filter((person, index, people) => people.findIndex((item) => item.id === person.id) === index)
    .slice(0, 30).map((person) => person.id));
  const sourcePeople = availablePeople.filter((person) => shownIds.has(person.id));
  const exhausted = state?.scouting?.exhausted ?? false;
  const nextCount = Math.min(state?.scouting?.remainingEligible ?? 9, 9);
  const visiblePeople = sourcePeople.filter((person) =>
    filter === "Talking"
      ? circle.active.includes(person.id)
      : filter === "Matches"
        ? readyIds.has(person.id)
        : true,
  );
  const phase =
    replay !== null
      ? "A moment in your conference"
      : running
        ? circle.active.length
          ? "Your twins are talking"
          : "Finding your kind of people"
        : run?.status === "failed"
          ? "Your twin needs a moment"
          : run
            ? "A circle of possibilities"
            : "Your twin is ready when you are";
  const detail =
    replay !== null
      ? `Replaying ${replay} of ${run?.events.length ?? 0} saved moments`
      : run
        ? `${Math.min(circle.people.length, 30)} people shown · ${run.conversationCount} conversations this scout`
        : `${Math.min(circle.community.length, 30)} fictional attendees shown · discover nine new matches each scout`;

  return (
    <section
      className="conference-graph-stage"
      aria-label="Your conference network"
    >
      <div className="conference-scope-bar">
        <select
          aria-label="Conference network scope"
          value={communityView ? "community" : "circle"}
          onChange={(event) => {
            setCommunityView(event.target.value === "community");
            setFilter("All");
          }}
        >
          <option value="circle">
            My circle{run ? ` · ${Math.min(circle.people.length, 30)}` : ""}
          </option>
          <option value="community">
            Community · {Math.min(circle.community.length, 30)}
          </option>
        </select>
        <span>
          {communityView
            ? "Zoom in to explore every twin"
            : "Meaningful connections"}
        </span>
      </div>
      <div className="conference-graph-toolbar">
        <div
          className="conference-graph-filters"
          aria-label="People in your circle"
        >
          {(["All", "Talking", "Matches"] as CircleFilter[]).map((value) => (
            <button
              key={value}
              className={filter === value ? "selected" : ""}
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
            >
              {value === "Matches" ? "For you" : value}
              {value === "All" && <small>{sourcePeople.length}</small>}
            </button>
          ))}
        </div>
        <div className="conference-graph-tools">
          <button
            className="conference-view-toggle"
            aria-label={
              listView ? "Show people graph" : "Show accessible people list"
            }
            onClick={() => setListView(!listView)}
          >
            {listView ? (
              <Network size={17} strokeWidth={1.6} />
            ) : (
              <List size={17} strokeWidth={1.6} />
            )}
          </button>
          <button
            className="conference-scout"
            onClick={() => {
              setReplay(null);
              onStart();
            }}
            disabled={!state || busy || running || exhausted}
          >
            {busy || running ? (
              <LoaderCircle size={14} className="conference-scout-spinner" />
            ) : (
              <Sparkles size={14} strokeWidth={1.5} />
            )}
            <span>
              {running
                ? "Connecting"
                : exhausted
                  ? "Everyone explored"
                  : `Scout ${nextCount} new`}
            </span>
            {!running && !busy && <ArrowRight size={13} />}
          </button>
        </div>
      </div>
      {error && (
        <div className="conference-graph-error" role="alert">
          <span>{error}</span>
          {onRetry && (
            <button onClick={onRetry}>
              Retry <RefreshCw size={13} />
            </button>
          )}
        </div>
      )}
      <div className={`conference-circle ${listView ? "is-list" : ""}`}>
        {!state ? (
          <div className="conference-circle-loading">
            <span />
            <p>Opening your circle…</p>
          </div>
        ) : listView ? (
          <div className="conference-graph-people-list">
            {visiblePeople.map((person) => (
              <button key={person.id} onClick={() => onPersonSelect(person.id)}>
                <PersonAvatar person={personFor(state, person.id)} size={38} />
                <span>
                  <strong>{person.name}</strong>
                  <small>
                    {person.role} · {person.company}
                  </small>
                </span>
                {circle.accepted.includes(person.id) ? (
                  <em>Ready to meet</em>
                ) : circle.completed.includes(person.id) ? (
                  <em>You met</em>
                ) : (
                  <ArrowRight size={14} />
                )}
              </button>
            ))}
          </div>
        ) : (
          <OrbitalGraph
            key={`${communityView ? "community" : "circle"}-${state.activeUserId}`}
            people={sourcePeople}
            selfPersonId={state.activeUserId}
            onSelect={(person) => onPersonSelect(person.id)}
            onTwinSelect={onTwinSelect}
            activeIds={circle.active}
            qualifiedIds={circle.qualified}
            acceptedIds={circle.accepted}
            completedIds={circle.completed}
            rejectedIds={circle.rejected}
            filter={filter}
            conferenceMode
            twinMood={running ? "working" : run ? "happy" : "idle"}
          />
        )}
        {state && !visiblePeople.length && (
          <div
            className={`conference-circle-empty ${listView ? "list-empty" : ""}`}
          >
            <p>
              {filter === "Talking"
                ? "No conversations in progress."
                : filter === "Matches"
                  ? "Your next meaningful hello is on its way."
                  : "Your circle is starting to unfold."}
            </p>
            {filter !== "All" && (
              <button onClick={() => setFilter("All")}>
                Show everyone <ArrowRight size={12} />
              </button>
            )}
          </div>
        )}
        {!run && state && (
          <span className="conference-preview-label">
            DEMO COMMUNITY PREVIEW
          </span>
        )}
      </div>
      <div className="conference-graph-footer">
        <div>
          <i className={running ? "working" : ""} />
          <span>
            <strong>{phase}</strong>
            <small>{detail}</small>
          </span>
        </div>
        {run && (
          <details
            className="conference-activity"
            onToggle={(event) => {
              if (!event.currentTarget.open) setReplay(null);
            }}
          >
            <summary>
              <RotateCcw size={12} />
              <span>Activity</span>
              <ChevronDown size={11} />
            </summary>
            <div className="conference-replay">
              <label htmlFor={`replay-${run.id}`}>
                {replay === null ? "Latest activity" : "Demo replay"}
              </label>
              <input
                id={`replay-${run.id}`}
                type="range"
                min="0"
                max={run.events.length}
                value={replay ?? run.events.length}
                onChange={(event) => setReplay(Number(event.target.value))}
              />
              <small>
                {events.at(-1)?.type.replaceAll(".", " ") ??
                  "Your twin is ready"}
              </small>
              {replay !== null && (
                <button onClick={() => setReplay(null)}>Return to live</button>
              )}
            </div>
          </details>
        )}
      </div>
    </section>
  );
}
