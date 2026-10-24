"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowRight,
  Check,
  LoaderCircle,
  MessageCircle,
  ShieldCheck,
  Star,
} from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { PersonAvatar } from "@/components/ui/avatar";
import { deriveConnections, type Connection } from "./model";
import { useConnections } from "./use-connections";
import ConferenceGraphStage from "@/components/conference/ConferenceGraphStage";
import ConferencePeopleRail from "@/components/conference/ConferencePeopleRail";
import CandidateDetails from "@/components/conference/CandidateDetails";
import TwinPreview from "@/components/conference/TwinPreview";
import ConnectionDetails from "./ConnectionDetails";
import "./connections.css";
import "@/components/conference/conference-workspace.css";

const FindTwinScreen = dynamic(
  () => import("@/components/find-twin/FindTwinScreen"),
  {
    loading: () => (
      <div className="connections-map-loading">
        <LoaderCircle size={22} />
        <span>Getting your meeting spot ready.</span>
      </div>
    ),
  },
);
type Popup = {
  type: "hello" | "details" | "find" | "feedback" | "candidate" | "twin";
  personId: string;
} | null;
export default function ConnectionsHub({
  eventId = "evt_demo",
  initialMatchId,
}: {
  eventId?: string;
  initialMatchId?: string;
}) {
  const { state, error, busy, refresh, act } = useConnections();
  const [popup, setPopup] = useState<Popup>(null);
  const [popupOpen, setPopupOpen] = useState(false);
  const cachedSelection = useRef<Connection | undefined>(undefined);
  function showPopup(next: Popup) {
    setPopup(next);
    setPopupOpen(!!next);
    setNotice("");
  }
  const [rating, setRating] = useState(5);
  const [note, setNote] = useState("");
  const [notice, setNotice] = useState("");
  const connections = useMemo(
    () => (state ? deriveConnections(state) : []),
    [state],
  );
  const currentSelection = connections.find(
    (item) => item.person.id === popup?.personId,
  );
  if (currentSelection) cachedSelection.current = currentSelection;
  const selected =
    currentSelection ??
    (cachedSelection.current?.person.id === popup?.personId
      ? cachedSelection.current
      : undefined);
  useEffect(() => {
    if (!initialMatchId || !state) return;
    const match = state.matches.find((item) => item.id === initialMatchId);
    if (match) showPopup({ type: "details", personId: match.candidateId });
  }, [initialMatchId, !!state]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 5000);
    return () => clearTimeout(timer);
  }, [notice]);
  const close = () => {
    setPopupOpen(false);
    setNotice("");
    void refresh();
  };
  async function respond(accept: boolean) {
    if (!selected) return;
    const incoming = selected.status === "incoming";
    const action = incoming
      ? { action: "respond-meeting", meetingId: selected.meeting!.id, accept }
      : { action: "request-intro", matchId: selected.match!.id };
    const updated = await act(action);
    if (!updated) return;
    if (incoming && accept) {
      showPopup({ type: "find", personId: selected.person.id });
      return;
    }
    setPopupOpen(false);
    setNotice(
      incoming
        ? "You passed on this introduction."
        : `Your invitation to ${selected.person.name.split(" ")[0]} is sent.`,
    );
  }
  function openConnection(connection: Connection) {
    if (connection.status === "ready" || connection.status === "met")
      showPopup({ type: "find", personId: connection.person.id });
    else showPopup({ type: "hello", personId: connection.person.id });
  }
  function inspectPerson(id: string) {
    const connection = connections.find((item) => item.person.id === id);
    showPopup({ type: connection ? "details" : "candidate", personId: id });
  }
  const firstName = selected?.person.name.split(" ")[0] ?? "";
  const candidate = state?.candidates.find(
    (person) => person.id === popup?.personId,
  );
  return (
    <div className="conference-workspace">
      <header className="conference-heading">
        <div>
          <span className="conference-eyebrow">
            MEANINGFUL CONNECTIONS
          </span>
          <h1>
            SF AI Summit <span className="conference-year">2026</span>
          </h1>
          <p>
            San Francisco <span>·</span> October 24–26
          </p>
        </div>
      </header>
      <div className="conference-intention">
        <span>HERE FOR</span>
        <p>{state?.goals.text ?? "A few meaningful connections."}</p>
      </div>
      <AnimatePresence>
        {notice && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            role="status"
            className="conference-notice"
          >
            <Check size={14} />
            {notice}
          </motion.div>
        )}
      </AnimatePresence>
      <div className="conference-canvas-grid">
        <ConferenceGraphStage
          state={state}
          onPersonSelect={inspectPerson}
          onTwinSelect={() =>
            state && showPopup({ type: "twin", personId: state.activeUserId })
          }
          onStart={() => void act({ action: "start-run" })}
          busy={busy}
          error={error}
          onRetry={() => void refresh()}
        />
        <ConferencePeopleRail
          connections={connections}
          loading={!state}
          onOpen={openConnection}
          onDetails={(connection) =>
            showPopup({ type: "details", personId: connection.person.id })
          }
        />
      </div>
      <div className="conference-bottom-note">
        <span>
          <ShieldCheck size={12} />
          Your twin connects. You choose.
        </span>
        <small>
          Demo conference · fictional attendees and seeded conversations
        </small>
      </div>
      {state && (
        <details className="connections-demo">
          <summary>Demo account</summary>
          <div>
            <label htmlFor="connections-account">Viewing as</label>
            <select
              id="connections-account"
              value={state.activeUserId}
              disabled={busy}
              onChange={async (event) => {
                setPopupOpen(false);
                setNotice("");
                await act({
                  action: "switch-user",
                  userId: event.target.value,
                });
              }}
            >
              <option value="usr_self">Alex Morgan</option>
              {state.candidates.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </select>
            <small>
              Fictional attendees. Each person reviews their own invitations.
            </small>
          </div>
        </details>
      )}
      <Dialog
        open={popupOpen && popup?.type === "candidate" && !!candidate}
        onClose={close}
        title="Someone worth knowing."
      >
        {candidate && state && (
          <CandidateDetails person={candidate} state={state} />
        )}
      </Dialog>
      <Dialog
        open={popupOpen && popup?.type === "twin" && !!state}
        onClose={close}
        title="Your conference twin."
      >
        {state && <TwinPreview state={state} />}
      </Dialog>
      <Dialog
        open={popupOpen && popup?.type === "hello" && !!selected}
        onClose={close}
        title={
          selected?.status === "incoming"
            ? `Meet ${firstName}?`
            : `Say hello to ${firstName}.`
        }
        description={
          selected?.status === "incoming"
            ? "They’d like to meet you. The next step is yours."
            : "A thoughtful introduction. One small yes."
        }
      >
        {selected && (
          <div className="connection-consent">
            <PersonAvatar person={selected.person} size={72} />
            <h3>{selected.person.name}</h3>
            <p>
              {selected.person.role} · {selected.person.company}
            </p>
            <div className="connection-consent-note">
              <ShieldCheck size={15} />
              <span>
                {selected.status === "incoming"
                  ? "Accept once, then choose your meeting spot together. Sharing a current zone is always optional."
                  : "Your approved profile is shared with this person. A meeting is confirmed only when they accept too."}
              </span>
            </div>
            {error && (
              <p className="connection-popup-error" role="alert">
                {error}
              </p>
            )}
            <button
              className="btn btn-primary connection-popup-primary"
              disabled={busy}
              onClick={() => void respond(true)}
            >
              {busy ? <LoaderCircle size={15} /> : <MessageCircle size={15} />}
              {selected.status === "incoming"
                ? "Yes, let’s meet"
                : "Send introduction"}
            </button>
            {selected.status === "incoming" && (
              <button
                className="connection-pass"
                disabled={busy}
                onClick={() => void respond(false)}
              >
                Not this time
              </button>
            )}
          </div>
        )}
      </Dialog>
      <Dialog
        open={popupOpen && popup?.type === "details" && !!selected}
        onClose={close}
        title="A little common ground."
      >
        {selected && (
          <>
            <ConnectionDetails
              connection={selected}
              state={state ?? undefined}
            />
            {selected.status === "new" || selected.status === "incoming" ? (
              <button
                className="btn btn-primary connection-popup-primary"
                onClick={() =>
                  showPopup({ type: "hello", personId: selected.person.id })
                }
              >
                {selected.status === "incoming"
                  ? "Respond to invitation"
                  : "Say hello"}
                <ArrowRight size={14} />
              </button>
            ) : selected.status === "ready" ? (
              <button
                className="btn btn-primary connection-popup-primary"
                onClick={() => openConnection(selected)}
              >
                Meet up <ArrowRight size={14} />
              </button>
            ) : selected.status === "met" &&
              selected.meeting?.ownerUserId === state?.activeUserId ? (
              <button
                className="btn btn-secondary connection-popup-primary"
                onClick={() => {
                  setRating(selected.meeting?.feedback?.relevance ?? 5);
                  setNote(selected.meeting?.feedback?.note ?? "");
                  showPopup({ type: "feedback", personId: selected.person.id });
                }}
              >
                Private feedback <Star size={14} />
              </button>
            ) : (
              <p className="connection-detail-waiting">
                {selected.status === "waiting"
                  ? `Your invitation is sent. ${firstName} gets to choose.`
                  : "Your meeting is saved."}
              </p>
            )}
            {selected.status === "new" && selected.match && (
              <button
                className="connection-pass connection-pass-center"
                disabled={busy}
                onClick={async () => {
                  if (
                    await act({
                      action: "decline-match",
                      matchId: selected.match!.id,
                    })
                  ) {
                    close();
                    setNotice("This suggestion is dismissed.");
                  }
                }}
              >
                Not for me
              </button>
            )}
          </>
        )}
      </Dialog>
      <Dialog
        open={popupOpen && popup?.type === "find" && !!selected?.meeting}
        onClose={close}
        title={
          selected?.status === "met" ? "Your moment." : `Meet ${firstName}.`
        }
        variant="wide"
      >
        {popup?.type === "find" && selected?.meeting && (
          <FindTwinScreen
            eventId={eventId}
            meetingId={selected.meeting.id}
            embedded
            onClose={close}
          />
        )}
      </Dialog>
      <Dialog
        open={popupOpen && popup?.type === "feedback" && !!selected?.meeting}
        onClose={close}
        title="How was your hello?"
        description="A private note to help your twin understand what matters."
      >
        <div className="connection-feedback">
          <div
            className="connection-feedback-stars"
            role="group"
            aria-label="Rate this connection"
          >
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                aria-label={`${value} out of 5`}
                aria-pressed={rating === value}
                onClick={() => setRating(value)}
              >
                <Star size={25} fill={value <= rating ? "#91866e" : "none"} />
              </button>
            ))}
          </div>
          <textarea
            aria-label="Private feedback"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What made the conversation meaningful?"
            maxLength={3000}
          />
          {error && (
            <p className="connection-popup-error" role="alert">
              {error}
            </p>
          )}
          <button
            className="btn btn-primary connection-popup-primary"
            disabled={busy}
            onClick={async () => {
              if (
                selected?.meeting &&
                (await act({
                  action: "feedback",
                  meetingId: selected.meeting.id,
                  relevance: rating,
                  note,
                }))
              ) {
                close();
                setNotice("Your private feedback is saved.");
              }
            }}
          >
            Save privately <Check size={14} />
          </button>
        </div>
      </Dialog>
    </div>
  );
}
