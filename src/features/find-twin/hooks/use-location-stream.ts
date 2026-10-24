"use client";

import { useEffect, useRef, useState } from "react";
import { meetingApi } from "../api/client";
import type { RendezvousView } from "../types";

export function useLocationStream(
  eventId: string,
  meetingId: string,
  view: RendezvousView | null,
  refresh: () => Promise<void>,
) {
  const [live, setLive] = useState(false);
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;
  const lastSeq = useRef(0);
  lastSeq.current = view?.lastSeq ?? 0;
  const active =
    !!view && !view.eventEnded && view.meetingStatus !== "completed";
  const userId = view?.viewerUserId;

  useEffect(() => {
    setLive(false);
    if (!active) return;
    let pending: ReturnType<typeof setTimeout> | undefined;
    const source = new EventSource(
      `${meetingApi(eventId, meetingId)}/location-stream?lastSeq=${lastSeq.current}`,
    );
    source.onopen = () => setLive(true);
    source.onmessage = () => {
      if (pending) clearTimeout(pending);
      pending = setTimeout(() => void refreshRef.current(), 90);
    };
    source.onerror = () => {
      setLive(false);
      void refreshRef.current();
    };
    const fallback = setInterval(() => void refreshRef.current(), 5000);
    return () => {
      source.close();
      clearInterval(fallback);
      if (pending) clearTimeout(pending);
    };
  }, [eventId, meetingId, active, userId]);

  return live;
}
