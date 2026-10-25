"use client";
import { useEffect, useRef, useState } from "react";
import { readCaptions, type Caption } from "./caption-reader";
export default function LiveCapture({
  token,
  disabled,
  onUse,
}: {
  token: string;
  disabled: boolean;
  onUse: (text: string) => void;
}) {
  const [consent, setConsent] = useState(false),
    [recording, setRecording] = useState(false),
    [status, setStatus] = useState(
      "Connect your Omi wearable to bring its words here.",
    );
  const [partial, setPartial] = useState(""),
    [captions, setCaptions] = useState<Caption[]>([]);
  const active = useRef<AbortController | null>(null),
    received = useRef<Caption[]>([]),
    ids = useRef(new Set<string>()),
    lastId = useRef("");
  useEffect(
    () => () => {
      active.current?.abort();
    },
    [],
  );
  function stop() {
    active.current?.abort();
    active.current = null;
    setRecording(false);
    setPartial("");
    setStatus("Listening stopped. Finalized words remain here for review.");
  }
  function clear() {
    received.current = [];
    ids.current.clear();
    lastId.current = "";
    setCaptions([]);
    setPartial("");
  }
  async function start() {
    if (!consent || active.current) return;
    // A new user-initiated session must never replay speech captured while stopped.
    lastId.current = "";
    const controller = new AbortController();
    active.current = controller;
    setRecording(true);
    setStatus("Connecting to your Omi bridge…");
    try {
      while (!controller.signal.aborted) {
        try {
          const response = await fetch("/api/omi-lab/live", {
            headers: {
              Authorization: `Bearer ${token}`,
              "X-Omi-Consent": "granted",
              ...(lastId.current ? { "Last-Event-ID": lastId.current } : {}),
            },
            cache: "no-store",
            signal: controller.signal,
          });
          if (!response.ok) {
            const body = await response.json();
            setStatus(body.error || "Unable to connect.");
            break;
          }
          if (!response.body) throw Error("Caption stream unavailable.");
          await readCaptions(response.body, (item) => {
            if (controller.signal.aborted) return;
            if (item.type === "status") {
              setStatus(item.text);
              return;
            }
            if (item.type === "partial") {
              setPartial(item.text);
              return;
            }
            setPartial("");
            if (ids.current.has(item.event_id!)) return;
            const next = [...received.current, item];
            if (next.length > 80 || JSON.stringify(next).length > 55_000) {
              controller.abort();
              setStatus(
                "Capture limit reached. Review these words before continuing.",
              );
              return;
            }
            ids.current.add(item.event_id!);
            lastId.current = item.event_id!;
            received.current = next;
            setCaptions(next);
          });
        } catch {
          if (controller.signal.aborted) break;
        }
        if (!controller.signal.aborted) {
          setStatus("Reconnecting to Omi…");
          await new Promise<void>((resolve) => {
            const finish = () => {
              clearTimeout(timer);
              controller.signal.removeEventListener("abort", finish);
              resolve();
            };
            const timer = setTimeout(finish, 1500);
            controller.signal.addEventListener("abort", finish, { once: true });
            if (controller.signal.aborted) finish();
          });
        }
      }
    } finally {
      if (active.current === controller) {
        active.current = null;
        setRecording(false);
        setPartial("");
      }
    }
  }
  const finalCount = captions.filter(
    (item) => item.type === "transcript",
  ).length;
  return (
    <section className="omi-live">
      <div className="omi-section-top">
        <h2>Listen to your day.</h2>
        <small>{recording ? "LISTENING" : "OMI WEARABLE"}</small>
      </div>
      <p>
        Live captions stay in this browser until you choose them for review.
        Partial words are never saved. Stopping here does not stop the wearable
        or its bridge.
      </p>
      <label className="omi-check">
        <input
          type="checkbox"
          disabled={recording || disabled}
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
        />
        Everyone present has agreed to live transcription through the Omi
        bridge.
      </label>
      <div className="omi-actions">
        <button
          disabled={disabled || !consent || recording}
          onClick={() => void start()}
        >
          Connect Omi
        </button>
        <button disabled={!recording} onClick={stop}>
          Stop listening
        </button>
      </div>
      <p role="status">{status}</p>
      <div className="omi-live-words" aria-label="Live Omi captions">
        {captions.slice(-5).map((item) => (
          <p
            key={item.event_id}
            className={item.type === "gap" ? "omi-live-gap" : ""}
          >
            {item.text}
          </p>
        ))}
        {partial && <p className="omi-live-partial">{partial}</p>}
      </div>
      {captions.length > 0 && (
        <>
          <small>
            {finalCount} finalized passages ·{" "}
            {captions.filter((item) => item.type === "gap").length} recording
            gaps
          </small>
          <div className="omi-actions">
            <button
              disabled={recording || disabled || !finalCount}
              onClick={() => {
                onUse(captions.map((item) => JSON.stringify(item)).join("\n"));
                clear();
              }}
            >
              Use captured words for review
            </button>
            <button disabled={recording || disabled} onClick={clear}>
              Discard captured words
            </button>
          </div>
        </>
      )}
    </section>
  );
}
