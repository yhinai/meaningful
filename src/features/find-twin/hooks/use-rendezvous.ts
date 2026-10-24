"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FindTwinApiError, findTwinApi } from "../api/client";
import type { RendezvousView } from "../types";
import type { VenueConfig } from "../venue/venue-types";
import { useLocationStream } from "./use-location-stream";

export function useRendezvous(eventId: string, meetingId: string) {
  const [view, setView] = useState<RendezvousView | null>(null);
  const [venue, setVenue] = useState<VenueConfig | null>(null);
  const [error, setError] = useState("");
  const [errorStatus, setErrorStatus] = useState(0);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(true);
  const [now, setNow] = useState(Date.now());
  const serverDelta = useRef(0);
  const version = useRef(0);
  const venueRef = useRef<VenueConfig | null>(null);
  const lastApplied = useRef<{
    userId: string;
    seq: number;
    time: number;
  } | null>(null);
  const mounted = useRef(true);

  const apply = useCallback((next: RendezvousView) => {
    const prior = lastApplied.current;
    const time = Date.parse(next.serverTime);
    if (
      prior?.userId === next.viewerUserId &&
      (next.lastSeq < prior.seq ||
        (next.lastSeq === prior.seq && time < prior.time))
    )
      return;
    lastApplied.current = {
      userId: next.viewerUserId,
      seq: next.lastSeq,
      time,
    };
    serverDelta.current = time - Date.now();
    setNow(Date.now() + serverDelta.current);
    setView(next);
    setOnline(true);
    setError("");
    setErrorStatus(0);
  }, []);

  const refresh = useCallback(async () => {
    const currentVersion = version.current;
    try {
      const [next, nextVenue] = await Promise.all([
        findTwinApi.get(eventId, meetingId),
        venueRef.current
          ? Promise.resolve(venueRef.current)
          : findTwinApi.venue(eventId),
      ]);
      if (!mounted.current || currentVersion !== version.current) return;
      venueRef.current = nextVenue;
      setVenue(nextVenue);
      apply(next);
    } catch (e) {
      if (!mounted.current || currentVersion !== version.current) return;
      setOnline(false);
      setError(
        e instanceof Error
          ? e.message
          : "You seem to be offline. Your confirmed meeting spot is saved.",
      );
      setErrorStatus(e instanceof FindTwinApiError ? e.status : 0);
      if (e instanceof FindTwinApiError && [401, 403, 404].includes(e.status))
        setView(null);
    } finally {
      if (mounted.current && currentVersion === version.current)
        setLoading(false);
    }
  }, [eventId, meetingId, apply]);

  useEffect(() => {
    mounted.current = true;
    setLoading(true);
    void refresh();
    const clock = setInterval(
      () => setNow(Date.now() + serverDelta.current),
      1000,
    );
    const offline = () => {
      setOnline(false);
      setError(
        "You’re offline. Your confirmed spot is saved; shared check-ins are hidden until you reconnect.",
      );
    };
    const reconnect = () => void refresh();
    window.addEventListener("offline", offline);
    window.addEventListener("online", reconnect);
    return () => {
      mounted.current = false;
      clearInterval(clock);
      window.removeEventListener("offline", offline);
      window.removeEventListener("online", reconnect);
    };
  }, [refresh]);

  const live = useLocationStream(eventId, meetingId, view, refresh);

  async function mutate(path: string, method: string, body?: unknown) {
    version.current += 1;
    setBusy(true);
    setError("");
    const currentVersion = version.current;
    try {
      const next = await findTwinApi.mutate(
        eventId,
        meetingId,
        path,
        method,
        body,
      );
      if (!mounted.current || currentVersion !== version.current) return false;
      version.current += 1;
      apply(next);
      return true;
    } catch (e) {
      if (!mounted.current || currentVersion !== version.current) return false;
      setError(e instanceof Error ? e.message : "Please try again.");
      if (e instanceof FindTwinApiError && e.status === 409) void refresh();
      if (!(e instanceof FindTwinApiError)) setOnline(false);
      return false;
    } finally {
      if (mounted.current) setBusy(false);
    }
  }

  async function switchAccount(userId: string) {
    version.current += 1;
    lastApplied.current = null;
    setView(null);
    setBusy(true);
    setLoading(true);
    setError("");
    try {
      await findTwinApi.switchAccount(userId);
      await refresh();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not switch demo accounts.",
      );
    } finally {
      if (mounted.current) {
        setBusy(false);
        setLoading(false);
      }
    }
  }

  const activeCheckIn = (checkIn: RendezvousView["self"]["checkIn"]) =>
    online &&
    !view?.eventEnded &&
    view?.meetingStatus !== "completed" &&
    checkIn &&
    Date.parse(checkIn.expiresAt) > now
      ? checkIn
      : null;
  return {
    view,
    venue,
    loading,
    busy,
    error,
    errorStatus,
    online,
    live,
    now,
    refresh,
    mutate,
    switchAccount,
    selfCheckIn: activeCheckIn(view?.self.checkIn ?? null),
    counterpartCheckIn: activeCheckIn(view?.counterpart.checkIn ?? null),
  };
}
