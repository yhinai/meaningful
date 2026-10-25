"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  Check,
  Download,
  FileText,
  LoaderCircle,
  Mic,
  Printer,
  Save,
  ShieldCheck,
  Square,
  Upload,
} from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import NotesDemo from "./NotesDemo";
import { makeDemoJournal } from "@/features/fieldnotes/demo";
import {
  emptyFieldnotes,
  parseTranscript,
  type Fieldnotes,
  type Passage,
} from "@/features/fieldnotes/model";
import "./fieldnotes.css";

type JournalView = {
  journal: Fieldnotes;
  viewer: string;
  counterpart: string;
  meetingStatus: string;
  generationConfigured: boolean;
  liveConfigured: boolean;
};
type Caption = {
  type: "transcript" | "gap";
  event_id: string;
  text: string;
  timestamp?: string;
};

export default function FieldnotesJournal({
  eventId,
  meetingId,
  demo = false,
}: {
  eventId: string;
  meetingId: string;
  demo?: boolean;
}) {
  const endpoint = `/api/events/${encodeURIComponent(eventId)}/meetings/${encodeURIComponent(meetingId)}/fieldnotes`;
  const [view, setView] = useState<JournalView | null>(null);
  const [draft, setDraft] = useState<Fieldnotes>(emptyFieldnotes);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [evidence, setEvidence] = useState<Passage | null>(null);
  const [consent, setConsent] = useState(false);
  const [recording, setRecording] = useState(false);
  const [liveStatus, setLiveStatus] = useState("");
  const [partial, setPartial] = useState("");
  const [captions, setCaptions] = useState<Caption[]>([]);
  const live = useRef<EventSource | null>(null);
  const captured = useRef<Caption[]>([]);
  const partialTurn = useRef("");
  const finalizedTurns = useRef(new Set<string>());
  const fileInput = useRef<HTMLInputElement>(null);
  const dirty =
    !demo &&
    !!view &&
    (draft.note !== view.journal.note ||
      draft.transcript !== view.journal.transcript ||
      JSON.stringify(draft.completedFollowups) !==
        JSON.stringify(view.journal.completedFollowups));

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    if (demo) {
      const journal = emptyFieldnotes();
      setView({
        journal,
        viewer: "demo",
        counterpart: "Sofia · simulated conversation",
        meetingStatus: "completed",
        generationConfigured: false,
        liveConfigured: false,
      });
      setDraft(journal);
      setLoading(false);
      return;
    }
    try {
      const response = await fetch(endpoint, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok)
        throw Error(data.error || "Your journal could not load.");
      setView(data);
      setDraft(data.journal);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setLoading(false);
    }
  }, [endpoint, demo]);
  const startDemo = useCallback(() => {
    setDraft(emptyFieldnotes());
    setNotice("");
    setError("");
  }, []);
  const completeDemo = useCallback(() => {
    const journal = makeDemoJournal();
    setDraft(journal);
    setView((previous) => (previous ? { ...previous, journal } : previous));
  }, []);
  useEffect(() => {
    void load();
    return () => {
      live.current?.close();
    };
  }, [load]);
  useEffect(() => {
    if (!dirty && !recording && !captions.length) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, recording, captions.length]);

  function applyJournal(journal: Fieldnotes) {
    setDraft(journal);
    setView((previous) => (previous ? { ...previous, journal } : previous));
  }
  async function save() {
    if (demo) {
      applyJournal(draft);
      return draft;
    }
    const response = await fetch(endpoint, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        revision: draft.revision,
        note: draft.note,
        transcript: draft.transcript,
        completedFollowups: draft.completedFollowups,
      }),
    });
    const result = await response.json();
    if (!response.ok)
      throw Error(result.error || "Your journal could not be saved.");
    applyJournal(result);
    return result as Fieldnotes;
  }
  async function act(action: "save" | "generate") {
    setBusy(action);
    setError("");
    setNotice("");
    try {
      const saved = dirty || draft.revision === 0 ? await save() : draft;
      if (action === "generate") {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ revision: saved.revision, consent: true }),
        });
        const result = await response.json();
        if (!response.ok)
          throw Error(result.error || "Your edition could not be prepared.");
        applyJournal(result);
        setConsent(false);
        setNotice("Your private edition is ready.");
      } else
        setNotice(
          demo
            ? "Demo notes updated for this session. Your real notes are unchanged."
            : "Saved privately. Only you can see these notes.",
        );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy("");
    }
  }
  async function importFile(file: File | undefined) {
    if (!file) return;
    try {
      if (file.size > 100000) throw Error("Choose a transcript under 100 KB.");
      const value = await file.text();
      if (value.length > 60000)
        throw Error("Use a transcript shorter than 60,000 characters.");
      parseTranscript(value);
      setDraft((previous) => ({ ...previous, transcript: value }));
      setError("");
      setNotice("Transcript imported. Save it to keep it in your journal.");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not import this transcript.",
      );
    }
    if (fileInput.current) fileInput.current.value = "";
  }
  function startLive() {
    setError("");
    setPartial("");
    setRecording(true);
    setLiveStatus("Connecting to your Omi…");
    const stream = new EventSource(`${endpoint}/live`);
    live.current = stream;
    stream.onmessage = (message) => {
      let item;
      try {
        item = JSON.parse(message.data);
      } catch {
        return;
      }
      if (item.type === "unavailable") {
        stream.close();
        setRecording(false);
        setPartial("");
        setLiveStatus(item.text);
        return;
      }
      if (item.type === "status") {
        setLiveStatus(item.text);
        return;
      }
      if (item.type === "partial") {
        if (item.utterance_id && finalizedTurns.current.has(item.utterance_id))
          return;
        partialTurn.current = item.utterance_id ?? "";
        setPartial(item.text);
        return;
      }
      if (
        !["transcript", "gap"].includes(item.type) ||
        !item.event_id ||
        captured.current.some((event) => event.event_id === item.event_id)
      )
        return;
      if (item.utterance_id) finalizedTurns.current.add(item.utterance_id);
      if (
        item.type === "gap" ||
        !item.utterance_id ||
        item.utterance_id === partialTurn.current
      )
        setPartial("");
      const next = [...captured.current, item] as Caption[];
      if (next.length > 180 || JSON.stringify(next).length > 45000) {
        stream.close();
        setRecording(false);
        setPartial("");
        setLiveStatus(
          "Capture limit reached. Add these passages to your journal before continuing.",
        );
        return;
      }
      captured.current = next;
      setCaptions(next);
    };
    stream.onerror = () => {
      setPartial("");
      if (stream.readyState === EventSource.CLOSED) {
        setRecording(false);
        setLiveStatus(
          "Live Omi is unavailable for this account. Your finalized captions are still here.",
        );
        return;
      }
      setLiveStatus(
        "Omi disconnected. Reconnecting; saved captions stay here.",
      );
    };
  }
  function stopLive() {
    live.current?.close();
    live.current = null;
    setRecording(false);
    setPartial("");
    setLiveStatus(
      "Listening stopped. Finalized captions are ready to add below. This does not stop your Omi device.",
    );
  }
  function attachCaptions() {
    try {
      const previous = parseTranscript(draft.transcript).sources.map(
        (source) => ({
          type: "transcript",
          event_id: source.id,
          text: source.text,
          timestamp: source.timestamp,
        }),
      );
      // Preserve gap records already present in an imported/captured JSONL transcript.
      const gaps = parseTranscript(draft.transcript).gapCount;
      const gapRecords = Array.from({ length: gaps }, (_, index) => ({
        type: "gap",
        event_id: `saved-gap-${index}`,
        text: "A passage was not transcribed.",
      }));
      const byId = new Map(
        [...previous, ...gapRecords, ...captured.current].map((item) => [
          item.event_id,
          item,
        ]),
      );
      const transcript = [...byId.values()]
        .map((item) => JSON.stringify(item))
        .join("\n");
      if (transcript.length > 60000)
        throw Error(
          "These captions exceed the journal limit. Export your current journal and use a shorter transcript.",
        );
      parseTranscript(transcript);
      setDraft((previous) => ({ ...previous, transcript }));
      captured.current = [];
      setCaptions([]);
      setNotice("Finalized captions added. Save your journal to keep them.");
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not attach captions.");
    }
  }
  function exportJournal() {
    const blob = new Blob(
      [JSON.stringify({ ...draft, counterpart: view?.counterpart }, null, 2)],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `meaningful-notes-${meetingId}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const edition =
    draft.transcript === view?.journal.transcript ? draft.edition : undefined;
  const refs = (ids: string[]) => (
    <div className="fn-sources">
      {ids.map((id) => (
        <button
          key={id}
          onClick={() =>
            setEvidence(
              draft.sources.find((source) => source.id === id) ?? null,
            )
          }
        >
          <FileText size={12} />{" "}
          {draft.sources.findIndex((source) => source.id === id) + 1 < 1
            ? id
            : `Passage ${draft.sources.findIndex((source) => source.id === id) + 1}`}
        </button>
      ))}
    </div>
  );
  const back = "/meaningful-notes";
  if (loading)
    return (
      <div className="fn-loading" role="status">
        <LoaderCircle className="fn-spin" size={24} /> Opening your journal…
      </div>
    );
  if (!view)
    return (
      <section className="fn-loading">
        <BookOpen size={30} />
        <h1>Your Meaningful Notes</h1>
        <p role="alert">{error}</p>
        <button className="btn" onClick={() => void load()}>
          Try again
        </button>
        <Link href={back}>Back to your people</Link>
        <Link className="fn-button" href="/meaningful-notes/demo">
          Try the demo <ArrowUpRight size={15} />
        </Link>
      </section>
    );

  return (
    <div className={`fieldnotes ${demo ? "is-demo" : ""}`}>
      <div className="fn-top">
        <Link
          href={back}
          onClick={(event) => {
            if (dirty || recording || captions.length) {
              event.preventDefault();
              setError(
                "Save your notes and add captured captions before leaving your journal.",
              );
            }
          }}
        >
          <ArrowLeft size={14} /> Your notes
        </Link>
        <span>
          <ShieldCheck size={13} />{" "}
          {demo
            ? "Illustrative demo · no live services"
            : "A private edition. Just for you."}
        </span>
      </div>
      <header className="fn-masthead">
        <div>
          <span className="fn-wordmark">
            Meaningful Notes<span>.</span>
          </span>
          <p>THE CONVERSATION IS ONLY THE BEGINNING</p>
        </div>
        <div className="fn-export">
          {!demo && (
            <Link className="mn-demo-link" href="/meaningful-notes/demo">
              Try demo <ArrowUpRight size={13} />
            </Link>
          )}
          <button onClick={exportJournal} aria-label="Download journal">
            <Download size={17} />
          </button>
          <button onClick={() => window.print()} aria-label="Print or save PDF">
            <Printer size={17} />
          </button>
        </div>
      </header>
      {demo && <NotesDemo onStart={startDemo} onComplete={completeDemo} />}
      <section className="fn-cover">
        <span className="fn-kicker">
          YOUR CONNECTION WITH {view.counterpart.toUpperCase()}
        </span>
        <h1>
          {edition?.title ?? (
            <>
              A good conversation.
              <br />
              <em>Something to keep.</em>
            </>
          )}
        </h1>
        <p>
          {edition?.standfirst ??
            "The ideas that linger. The things you promised. A little space to turn a meaningful hello into what comes next."}
        </p>
        <div className="fn-cover-foot">
          <span>
            {view.meetingStatus === "completed"
              ? "AFTER THE HELLO"
              : "IN THE MOMENT"}
          </span>
          <BookOpen size={22} strokeWidth={1} />
          <span>
            {demo
              ? "ILLUSTRATIVE DEMO EDITION"
              : edition
                ? "YOUR PERSONAL EDITION"
                : "A NEW CHAPTER"}
          </span>
        </div>
      </section>
      {error && (
        <div className="fn-alert" role="alert">
          {error}
          <button disabled={!!busy || recording} onClick={() => void load()}>
            Reload saved journal
          </button>
        </div>
      )}
      {notice && (
        <p className="fn-notice" role="status">
          <Check size={14} />
          {notice}
        </p>
      )}
      {edition && (
        <div className="fn-edition">
          <section>
            <div className="fn-section-heading">
              <h2>What stays with you.</h2>
              <span>THE ESSENTIALS</span>
            </div>
            <div className="fn-takeaways">
              {edition.takeaways.map((item, index) => (
                <article key={index}>
                  <span className="fn-number">0{index + 1}</span>
                  <p>{item.text}</p>
                  {refs(item.source_ids)}
                </article>
              ))}
            </div>
          </section>
          <div className="fn-story-grid">
            <section aria-label="Your conversation stories">
              {edition.sections.map((section, index) => (
                <article className="fn-story" key={index}>
                  <span className="fn-kicker">
                    FROM YOUR CONVERSATION · 0{index + 1}
                  </span>
                  <h2>{section.title}</h2>
                  <p>{section.summary}</p>
                  {refs(section.source_ids)}
                </article>
              ))}
            </section>
            <aside>
              <span className="fn-kicker">A NOTE IN THE MARGIN</span>
              <h3>A moment, with a point of view.</h3>
              <p>
                Every story links back to words in your transcript. Open a
                passage to revisit the conversation.
              </p>
              <p>
                AI-written from your recording. Review the interpretation; a
                source link does not verify a claim.
              </p>
              {draft.gapCount > 0 && (
                <p>
                  {draft.gapCount} recording gap
                  {draft.gapCount === 1 ? "" : "s"}. Missing passages were
                  excluded.
                </p>
              )}
              <small>
                {draft.generatedAt &&
                  `Edition saved ${new Date(draft.generatedAt).toLocaleString()}`}
              </small>
            </aside>
          </div>
          {edition.followups.length > 0 && (
            <section className="fn-followups">
              <div className="fn-section-heading">
                <h2>Take the conversation forward.</h2>
                <span>YOUR NEXT CHAPTER</span>
              </div>
              {edition.followups.map((item, index) => (
                <article key={index}>
                  <label>
                    <input
                      type="checkbox"
                      checked={draft.completedFollowups.includes(index)}
                      disabled={!!busy}
                      onChange={(event) =>
                        setDraft((previous) => ({
                          ...previous,
                          completedFollowups: event.target.checked
                            ? [...previous.completedFollowups, index]
                            : previous.completedFollowups.filter(
                                (value) => value !== index,
                              ),
                        }))
                      }
                    />
                    <span>
                      <small>
                        {item.kind === "commitment"
                          ? "RECORDED COMMITMENT"
                          : "SUGGESTED NEXT STEP"}
                      </small>
                      <p>{item.text}</p>
                    </span>
                  </label>
                  {refs(item.source_ids)}
                </article>
              ))}
              <p className="fn-small">
                Check off a step, then save your journal. No messages are sent.
              </p>
            </section>
          )}
        </div>
      )}
      <div className="fn-editor-grid">
        <section className="fn-reflection">
          <span className="fn-kicker">IN YOUR OWN WORDS</span>
          <h2>A note to your future self.</h2>
          <label htmlFor="fn-note">
            What made this conversation meaningful?
          </label>
          <textarea
            id="fn-note"
            value={draft.note}
            disabled={!!busy}
            maxLength={6000}
            placeholder="An idea worth exploring. A question to ask next time. Something you don’t want to forget."
            onChange={(event) =>
              setDraft((previous) => ({
                ...previous,
                note: event.target.value,
              }))
            }
          />
          <p className="fn-small">
            Private to your account. Your connection cannot read this.
          </p>
        </section>
        <section className="fn-recording">
          <span className="fn-kicker">LISTEN. REMEMBER. REDISCOVER.</span>
          <h2>Let the words stay.</h2>
          <p>
            Bring in an Omi transcript, or listen during your conversation. Save
            only what you want to keep.
          </p>
          {!demo && (
            <details
              className="fn-live"
              open={recording || captions.length > 0 || undefined}
            >
              <summary>
                <Mic size={15} /> Live from your Omi
              </summary>
              <p>
                Start after everyone in the conversation agrees. This receives
                captions from your configured Omi bridge; your browser
                microphone stays off.
              </p>
              {view.liveConfigured ? (
                <>
                  <button
                    className={`fn-button ${recording ? "is-listening" : ""}`}
                    onClick={recording ? stopLive : startLive}
                    disabled={!!busy}
                  >
                    {recording ? <Square size={14} /> : <Mic size={14} />}
                    {recording ? "Stop listening" : "Start listening"}
                  </button>
                  <p role="status" className="fn-small">
                    {liveStatus}
                  </p>
                  <div className="fn-caption-log" role="log" aria-live="off">
                    {captions.slice(-12).map((item) => (
                      <p
                        key={item.event_id}
                        className={item.type === "gap" ? "fn-gap" : ""}
                      >
                        {item.type === "gap" ? "Recording gap: " : ""}
                        {item.text}
                      </p>
                    ))}
                    {partial && (
                      <p className="fn-partial">
                        {partial}
                        <small>Live draft · words may change</small>
                      </p>
                    )}
                  </div>
                  {captions.length > 0 && (
                    <button
                      className="fn-button fn-secondary"
                      disabled={recording || !!busy}
                      onClick={attachCaptions}
                    >
                      Add{" "}
                      {
                        captions.filter((item) => item.type === "transcript")
                          .length
                      }{" "}
                      finalized{" "}
                      {captions.filter((item) => item.type === "transcript")
                        .length === 1
                        ? "passage"
                        : "passages"}{" "}
                      <ArrowUpRight size={14} />
                    </button>
                  )}
                  {!recording && captions.length > 0 && (
                    <button
                      className="fn-discard"
                      disabled={!!busy}
                      onClick={() => {
                        captured.current = [];
                        setCaptions([]);
                        setNotice("Unsaved captured captions discarded.");
                      }}
                    >
                      Discard unsaved captions
                    </button>
                  )}
                  <p className="fn-small">
                    Only finalized passages are added. Listening starts now;
                    earlier recordings are not imported. Stop, add passages,
                    then save before leaving.
                  </p>
                </>
              ) : (
                <p className="fn-small">
                  Live Omi hasn’t been connected to this account yet. You can
                  import a transcript below.
                </p>
              )}
            </details>
          )}
          <div className="fn-transcript-head">
            <label htmlFor="fn-transcript">Conversation transcript</label>
            <button
              disabled={!!busy || recording}
              onClick={() => fileInput.current?.click()}
            >
              <Upload size={13} /> Import
            </button>
            <input
              ref={fileInput}
              type="file"
              accept=".txt,.jsonl,.json,text/plain,application/json"
              hidden
              onChange={(event) => void importFile(event.target.files?.[0])}
            />
          </div>
          <textarea
            id="fn-transcript"
            disabled={!!busy || recording}
            maxLength={60000}
            value={draft.transcript}
            onChange={(event) =>
              setDraft((previous) => ({
                ...previous,
                transcript: event.target.value,
              }))
            }
            placeholder="Paste finalized words here, or import an Omi JSONL export. Separate plain text passages with a blank line."
          />
          <p className="fn-small">
            Up to 60,000 characters. Only include this meeting’s conversation.
            Changing the transcript replaces its edition after saving.
          </p>
        </section>
      </div>
      <section className="fn-save">
        <div>
          <span className="fn-kicker">
            {dirty
              ? "UNSAVED CHANGES"
              : draft.updatedAt
                ? "SAFELY TUCKED AWAY"
                : "MAKE ROOM FOR WHAT MATTERS"}
          </span>
          <p>
            {edition
              ? "Keep the conversation moving."
              : "Your words today. Your story tomorrow."}
          </p>
        </div>
        <button
          className="fn-button fn-secondary"
          disabled={!!busy || recording}
          onClick={() => void act("save")}
        >
          {busy === "save" ? (
            <LoaderCircle className="fn-spin" size={15} />
          ) : (
            <Save size={15} />
          )}{" "}
          Save privately
        </button>
      </section>
      {!demo && (
        <section className="fn-generate">
          <div>
            <h2>Make your edition.</h2>
            <p>
              Turn the saved transcript into stories, takeaways, and thoughtful
              next steps.
            </p>
            {!view.generationConfigured && (
              <p className="fn-small">
                Your edition editor hasn’t been connected yet. You can still
                save notes and transcripts privately.
              </p>
            )}
            {view.meetingStatus !== "completed" && (
              <p className="fn-small">
                Your notes and live captions are available now. Confirm the
                meeting to create your after-meeting edition.
              </p>
            )}
            <label className="fn-consent">
              <input
                type="checkbox"
                checked={consent}
                disabled={!!busy || !view.generationConfigured || recording}
                onChange={(event) => setConsent(event.target.checked)}
              />
              <span>
                Send this transcript to the configured Gemini account to make my
                private edition. Normal API charges apply. My private note stays
                here.
              </span>
            </label>
          </div>
          <button
            className="fn-button"
            disabled={
              !!busy ||
              recording ||
              !consent ||
              !view.generationConfigured ||
              !draft.transcript.trim() ||
              view.meetingStatus !== "completed"
            }
            onClick={() => void act("generate")}
          >
            {busy === "generate" ? (
              <LoaderCircle className="fn-spin" size={16} />
            ) : (
              <BookOpen size={16} />
            )}
            {busy === "generate"
              ? "Preparing your edition…"
              : edition
                ? "Make a fresh edition"
                : "Make my edition"}
            <ArrowUpRight size={15} />
          </button>
        </section>
      )}
      <footer className="fn-footer">
        <span>Meaningful Notes / A personal edition by MeaningfulMeet</span>
        <span>Inspired by Omi. Kept by you.</span>
      </footer>
      <Dialog
        open={!!evidence}
        onClose={() => setEvidence(null)}
        title="The words behind the story."
        description={evidence?.timestamp ?? "A supporting transcript passage"}
      >
        <blockquote className="fn-evidence">{evidence?.text}</blockquote>
        <p className="fn-small">
          Transcripts can contain mistakes. This passage shows what the editor
          used.
        </p>
      </Dialog>
    </div>
  );
}
