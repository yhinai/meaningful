"use client";
import { useState } from "react";
import {
  fixtureText,
  parseTranscript,
  type Segment,
  type Insight,
  type Edition,
} from "./model";
import "./omi-lab.css";
import LiveCapture from "./live-capture";

type Paths = { path: string; quote: string; segment: string }[];
export default function OmiLab() {
  const [saved, setSaved] = useState<{ id: string; createdAt: string }[]>([]);
  const [token, setToken] = useState(""),
    [unlocked, setUnlocked] = useState(false),
    [status, setStatus] = useState<Record<string, string>>({});
  const [text, setText] = useState(""),
    [source, setSource] = useState<"synthetic" | "omi-import">("omi-import"),
    [segments, setSegments] = useState<Segment[]>([]);
  const [consent, setConsent] = useState(false),
    [insights, setInsights] = useState<Insight[]>([]),
    [selected, setSelected] = useState<string[]>([]);
  const [edition, setEdition] = useState<Edition | null>(null),
    [page, setPage] = useState(1),
    [paths, setPaths] = useState<Paths>([]);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [trace, setTrace] = useState<string[]>([]),
    [provider, setProvider] = useState("");
  async function api(action?: string, input?: unknown, id?: string) {
    const response = await fetch(
      id && !action
        ? `/api/omi-lab?id=${encodeURIComponent(id)}`
        : "/api/omi-lab",
      {
        method: action ? "POST" : "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          ...(action ? { "Content-Type": "application/json" } : {}),
        },
        ...(action ? { body: JSON.stringify({ action, input, id }) } : {}),
        cache: "no-store",
      },
    );
    const body = await response.json();
    if (!response.ok) throw Error(body.error || "Request failed.");
    return body;
  }
  async function run(task: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await task();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  function resetAnalysis() {
    setInsights([]);
    setSelected([]);
    setTrace([]);
    setProvider("");
    setConsent(false);
  }
  function review(value: string) {
    try {
      setSegments(parseTranscript(value));
      setError("");
    } catch (e) {
      setSegments([]);
      setError(e instanceof Error ? e.message : "Unable to read transcript.");
    }
    resetAnalysis();
  }
  function demo() {
    setText(fixtureText);
    setSource("synthetic");
    review(fixtureText);
    setEdition(null);
    setPaths([]);
  }
  const approved = insights.filter((insight) => selected.includes(insight.id));
  return (
    <div className="omi-lab">
      <header className="omi-lab-heading">
        <span className="omi-kicker">FIELDNOTES / OMI LAB</span>
        <h1>A day worth remembering.</h1>
        <p>
          Keep the words that matter. Turn approved moments into your private
          conference journal.
        </p>
      </header>
      {!unlocked ? (
        <section className="omi-access">
          <h2>Your private workspace</h2>
          <p>
            Enter OMI_LAB_TOKEN from this checkout’s .env. This operator lab is
            separate from the app’s fictional demo accounts.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void run(async () => {
                const result = await api();
                setStatus(result);
                setSaved(result.editions);
                setUnlocked(true);
              });
            }}
          >
            <label htmlFor="omi-token">Workspace access token</label>
            <input
              id="omi-token"
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              autoComplete="off"
              required
            />
            <button disabled={busy}>Open workspace</button>
          </form>
        </section>
      ) : (
        <>
          <div className="omi-status">
            <span>FalkorDB: {status.falkordb}</span>
            <span>Analysis: {status.openai}</span>
            <button
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  const result = await api("check");
                  setStatus({ ...status, falkordb: result.falkordb });
                })
              }
            >
              Check connection
            </button>
            <button
              onClick={() => {
                setUnlocked(false);
                setToken("");
                setText("");
                setSegments([]);
                setEdition(null);
                setPaths([]);
                resetAnalysis();
              }}
            >
              Lock
            </button>
          </div>
          {saved.length > 0 && (
            <label className="omi-saved">
              Saved editions
              <select
                value={edition?.id ?? ""}
                disabled={busy}
                onChange={(e) => {
                  const id = e.target.value;
                  if (id)
                    void run(async () => {
                      setEdition((await api(undefined, undefined, id)).edition);
                      setPage(1);
                      setPaths([]);
                    });
                }}
              >
                <option value="">Choose an edition</option>
                {saved.map((item) => (
                  <option key={item.id} value={item.id}>
                    {new Date(item.createdAt).toLocaleString()}
                  </option>
                ))}
              </select>
            </label>
          )}
          <nav className="omi-steps" aria-label="Journal workflow">
            <span>01 Review words</span>
            <span>02 Choose insights</span>
            <span>03 Read your day</span>
          </nav>
          {!edition ? (
            <>
              <LiveCapture
                token={token}
                disabled={busy}
                onUse={(value) => {
                  setText(value);
                  setSource("omi-import");
                  review(value);
                }}
              />
              <div className="omi-workflow">
                <section>
                  <div className="omi-section-top">
                    <h2>Start with the source.</h2>
                    <button disabled={busy} onClick={demo}>
                      Try a fictional day
                    </button>
                  </div>
                  <p>
                    Import finalized Omi JSONL, a Meaningful Notes download, or
                    a text transcript. Recording and transcription consent must
                    already be in place. Review and remove anything private
                    before analysis.
                  </p>
                  <label className="omi-upload">
                    Import transcript
                    <input
                      type="file"
                      accept=".txt,.jsonl,.json"
                      disabled={busy}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file)
                          void run(async () => {
                            if (file.size > 60_000)
                              throw Error("Import must be smaller than 60 KB.");
                            const value = await file.text();
                            setText(value);
                            setSource("omi-import");
                            review(value);
                          });
                        e.target.value = "";
                      }}
                    />
                  </label>
                  <label htmlFor="omi-source">
                    Editable source ·{" "}
                    {source === "synthetic" ? "FICTIONAL SAMPLE" : "OMI IMPORT"}
                  </label>
                  <textarea
                    id="omi-source"
                    value={text}
                    disabled={busy}
                    placeholder="Paste finalized speech here…"
                    onChange={(e) => {
                      setText(e.target.value);
                      setSource("omi-import");
                      setSegments([]);
                      resetAnalysis();
                    }}
                  />
                  <button
                    disabled={busy || !text.trim()}
                    onClick={() => review(text)}
                  >
                    Review segments
                  </button>
                  {segments.length > 0 && (
                    <div className="omi-segments">
                      {segments.map((segment) => (
                        <article key={segment.id}>
                          <small>{segment.id}</small>
                          <p>{segment.text}</p>
                          <button
                            aria-label={`Remove ${segment.id}`}
                            disabled={busy}
                            onClick={() => {
                              setSegments(
                                segments.filter((s) => s.id !== segment.id),
                              );
                              resetAnalysis();
                            }}
                          >
                            Remove
                          </button>
                        </article>
                      ))}
                    </div>
                  )}
                  <label className="omi-check">
                    <input
                      type="checkbox"
                      checked={consent}
                      disabled={busy || !segments.length}
                      onChange={(e) => setConsent(e.target.checked)}
                    />
                    I reviewed these segments and approve sending only these
                    words for AI analysis. Fictional samples run locally.
                  </label>
                  <button
                    className="omi-primary"
                    disabled={busy || !consent || !segments.length}
                    onClick={() =>
                      void run(async () => {
                        const result = await api("analyze", {
                          source,
                          segments,
                          analysisConsent: true,
                        });
                        setInsights(result.insights);
                        setSelected([]);
                        setProvider(result.provider);
                        setTrace(result.trace);
                      })
                    }
                  >
                    Find the highlights
                  </button>
                </section>
                <section>
                  <h2>Keep what feels true.</h2>
                  <p>
                    Review each suggested insight. Only checked insights and
                    their evidence are saved. Suggestions remain suggestions.
                  </p>
                  {provider && (
                    <small className="omi-provider">{provider}</small>
                  )}
                  {!insights.length && (
                    <p className="omi-empty">
                      Your highlights will appear here after analysis.
                    </p>
                  )}
                  {insights.map((insight) => (
                    <article className="omi-insight" key={insight.id}>
                      <label className="omi-check">
                        <input
                          type="checkbox"
                          disabled={busy}
                          checked={selected.includes(insight.id)}
                          onChange={(e) =>
                            setSelected(
                              e.target.checked
                                ? [...selected, insight.id]
                                : selected.filter((id) => id !== insight.id),
                            )
                          }
                        />
                        <strong>{insight.title}</strong>
                      </label>
                      <label>
                        Description
                        <textarea
                          disabled={busy}
                          value={insight.description}
                          onChange={(e) =>
                            setInsights(
                              insights.map((i) =>
                                i.id === insight.id
                                  ? { ...i, description: e.target.value }
                                  : i,
                              ),
                            )
                          }
                        />
                      </label>
                      <small>
                        {insight.kind.replace("_", " ")} · {insight.confidence}
                      </small>
                      <details>
                        <summary>View source evidence</summary>
                        {insight.evidenceSegmentIds.map((id) => (
                          <blockquote key={id}>
                            {segments.find((s) => s.id === id)?.text}
                            <cite>{id}</cite>
                          </blockquote>
                        ))}
                      </details>
                    </article>
                  ))}
                  {trace.length > 0 && (
                    <details>
                      <summary>Analysis trace</summary>
                      <ul>
                        {trace.map((line) => (
                          <li key={line}>{line}</li>
                        ))}
                      </ul>
                      <p>
                        TrueForge is not integrated. Live analysis uses OpenAI
                        directly.
                      </p>
                    </details>
                  )}
                  <button
                    className="omi-primary"
                    disabled={busy || !approved.length}
                    onClick={() =>
                      void run(async () => {
                        const result = await api("generate", {
                          source,
                          segments,
                          analysisConsent: true,
                          insights: approved,
                          approval: true,
                        });
                        setEdition(result.edition);
                        setSaved((await api()).editions);
                        setPage(1);
                        setPaths([]);
                      })
                    }
                  >
                    Approve & create private edition
                  </button>
                </section>
              </div>
            </>
          ) : (
            <section className="omi-edition-wrap">
              <div className="omi-section-top">
                <p>
                  {edition.source === "synthetic"
                    ? "Fictional sample"
                    : "Reviewed Omi transcript"}{" "}
                  · Graph: {edition.graphStatus}
                </p>
                <button
                  disabled={busy}
                  onClick={() => {
                    setEdition(null);
                    setPaths([]);
                  }}
                >
                  Back to review
                </button>
              </div>
              <article className="omi-edition">
                <header>
                  <span>THE PERSONAL EDITION</span>
                  <span>
                    {new Date(edition.createdAt).toLocaleDateString(undefined, {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                </header>
                {page === 1 ? (
                  <>
                    <span className="omi-kicker">MY CONFERENCE STORY</span>
                    <h2>
                      The moments
                      <br />
                      that stayed.
                    </h2>
                    <p className="omi-deck">
                      A private collection of words and ideas you chose to keep.
                    </p>
                    {edition.insights
                      .filter((i) => i.kind !== "follow_up")
                      .map((insight) => (
                        <section key={insight.id}>
                          <h3>{insight.title}</h3>
                          <p>{insight.description}</p>
                          <small>
                            {insight.confidence} · Source:{" "}
                            {insight.evidenceSegmentIds.join(", ")}
                          </small>
                        </section>
                      ))}
                    {!edition.insights.some((i) => i.kind !== "follow_up") && (
                      <p>Your selected moments appear on the next page.</p>
                    )}
                  </>
                ) : (
                  <>
                    <span className="omi-kicker">
                      PEOPLE, IDEAS & NEXT STEPS
                    </span>
                    <h2>
                      Carry it
                      <br />
                      forward.
                    </h2>
                    {edition.insights
                      .filter((i) => i.kind === "follow_up")
                      .map((insight) => (
                        <section key={insight.id}>
                          <h3>{insight.title}</h3>
                          <p>{insight.description}</p>
                          <small>
                            Possible follow-up ·{" "}
                            {insight.evidenceSegmentIds.join(", ")}
                          </small>
                        </section>
                      ))}
                    {!edition.insights.some((i) => i.kind === "follow_up") && (
                      <p>No follow-ups were approved for this edition.</p>
                    )}
                    <details open>
                      <summary>Evidence notebook</summary>
                      {edition.segments.map((segment) => (
                        <blockquote key={segment.id}>
                          {segment.text}
                          <cite>{segment.id}</cite>
                        </blockquote>
                      ))}
                    </details>
                  </>
                )}
                <footer>
                  <span>Private · approved by you</span>
                  <span>0{page} / 02</span>
                </footer>
              </article>
              <nav className="omi-page-nav" aria-label="Magazine pages">
                <button disabled={page === 1} onClick={() => setPage(1)}>
                  ← My story
                </button>
                <button disabled={page === 2} onClick={() => setPage(2)}>
                  Ideas & next steps →
                </button>
              </nav>
              <div className="omi-actions">
                <button
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      const result = await api("sync", undefined, edition.id);
                      setEdition(result.edition);
                    })
                  }
                >
                  Retry graph sync
                </button>
                <button
                  disabled={busy || edition.graphStatus !== "synced"}
                  onClick={() =>
                    void run(async () =>
                      setPaths(
                        (await api("paths", undefined, edition.id)).paths,
                      ),
                    )
                  }
                >
                  Show graph evidence
                </button>
                <button
                  disabled={busy}
                  onClick={() => {
                    const blob = new Blob([JSON.stringify(edition, null, 2)], {
                      type: "application/json",
                    });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `private-edition-${edition.id}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  Export private edition
                </button>
                <button
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      await api("delete", undefined, edition.id);
                      setSaved((await api()).editions);
                      setEdition(null);
                      setPaths([]);
                    })
                  }
                >
                  Delete edition & graph evidence
                </button>
              </div>
              {paths.length > 0 && (
                <div className="omi-paths">
                  {paths.map((path, index) => (
                    <p key={index}>
                      {path.path}
                      <br />
                      <q>{path.quote}</q>
                    </p>
                  ))}
                </div>
              )}
              <small>
                Edition ID: {edition.id}. Public sharing is disabled. Private
                editions are stored only on this server and the configured
                graph.
              </small>
            </section>
          )}
        </>
      )}
      {busy && <p role="status">Working on your journal…</p>}
      {error && (
        <p className="omi-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
