"use client";
import { useCallback, useSyncExternalStore } from "react";
import {
  isTwinStyle,
  twinStyleForPerson,
  type TwinStyleId,
} from "@/lib/twin-styles";
const listeners = new Set<() => void>();
const sessionStyles = new Map<string, TwinStyleId>();
const notify = () => listeners.forEach((listener) => listener());
function subscribe(listener: () => void) {
  if (listeners.size === 0) window.addEventListener("storage", notify);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", notify);
  };
}
export function useTwinStyle(personId = "usr_self") {
  const key = `meaningfulmeet:twin-style:v1:${personId}`;
  const fallback = twinStyleForPerson(personId);
  const snapshot = useCallback(() => {
    try {
      const stored = localStorage.getItem(key);
      return isTwinStyle(stored)
        ? stored
        : (sessionStyles.get(key) ?? fallback);
    } catch {
      return sessionStyles.get(key) ?? fallback;
    }
  }, [key, fallback]);
  const serverSnapshot = useCallback(() => fallback, [fallback]);
  const style = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const setStyle = useCallback(
    (value: TwinStyleId) => {
      sessionStyles.set(key, value);
      try {
        localStorage.setItem(key, value);
      } catch {
        /* Keep the selected creature for this session if storage is unavailable. */
      }
      notify();
    },
    [key],
  );
  return [style, setStyle] as const;
}
