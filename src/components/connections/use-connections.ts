"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { DemoState } from "@/lib/types";

export function useConnections() {
  const [state, setState] = useState<DemoState | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const generation = useRef(0);
  const alive = useRef(true);
  const mutationInFlight = useRef(false);
  const refresh = useCallback(async () => {
    const version = generation.current;
    try {
      const response = await fetch("/api/demo/state", { cache: "no-store" });
      if (!response.ok)
        throw Error("Your connections couldn’t load. Please try again.");
      const next = (await response.json()) as DemoState;
      if (alive.current && version === generation.current) {
        setState(next);
        setError("");
      }
    } catch (e) {
      if (alive.current && version === generation.current)
        setError(e instanceof Error ? e.message : "Please try again.");
    }
  }, []);
  useEffect(() => {
    alive.current = true;
    void refresh();
    const visible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", visible);
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 4000);
    return () => {
      alive.current = false;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [refresh]);

  const run = state?.runs.at(-1);
  const running = run?.status === "running";
  useEffect(() => {
    if (!running || !run) return;
    let pending: ReturnType<typeof setTimeout> | undefined;
    const source = new EventSource(
      `/api/events/${encodeURIComponent(run.eventId)}/twin-runs/${encodeURIComponent(run.id)}/stream?lastSeq=${run.events.length}`,
    );
    source.onmessage = () => {
      if (pending) clearTimeout(pending);
      pending = setTimeout(() => void refresh(), 90);
    };
    source.onerror = () => void refresh();
    return () => {
      source.close();
      if (pending) clearTimeout(pending);
    };
  }, [run?.id, running, refresh]);

  async function act(action: Record<string, unknown>) {
    if (mutationInFlight.current) return null;
    mutationInFlight.current = true;
    generation.current += 1;
    const version = generation.current;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/demo/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action),
      });
      const next = await response.json();
      if (!response.ok)
        throw Error(
          next.error || "Couldn’t update your connection. Please try again.",
        );
      if (alive.current && version === generation.current) {
        generation.current += 1;
        setState(next);
      }
      return next as DemoState;
    } catch (e) {
      if (alive.current)
        setError(e instanceof Error ? e.message : "Please try again.");
      return null;
    } finally {
      mutationInFlight.current = false;
      if (alive.current) setBusy(false);
    }
  }
  return { state, error, busy, refresh, act };
}
