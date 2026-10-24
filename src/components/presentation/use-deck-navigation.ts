"use client";
import { useCallback, useEffect, useRef, useState } from "react";

const fromUrl = () => {
  const value = Number(
    new URLSearchParams(window.location.search).get("slide") || 1,
  );
  return Number.isFinite(value)
    ? Math.min(6, Math.max(0, Math.trunc(value) - 1))
    : 0;
};
export function useDeckNavigation() {
  const [index, setIndex] = useState(0);
  const [stage, setStage] = useState(false);
  const [notes, setNotes] = useState(false);
  const [shortcuts, setShortcuts] = useState(false);
  const [notice, setNotice] = useState("");
  const touch = useRef<{ x: number; y: number } | null>(null);
  const go = useCallback((next: number) => {
    const bounded = Math.max(0, Math.min(6, next));
    setIndex(bounded);
    const url = new URL(window.location.href);
    url.searchParams.set("slide", String(bounded + 1));
    window.history.pushState({}, "", url);
  }, []);
  const fullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (document.documentElement.requestFullscreen)
        await document.documentElement.requestFullscreen();
      else
        setNotice(
          "Fullscreen is unavailable. Use your browser’s presentation controls.",
        );
    } catch {
      setNotice("Fullscreen unavailable. The deck is ready in this window.");
    }
  }, []);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [index]);
  useEffect(() => {
    const sync = () => {
      setIndex(fromUrl());
      setStage(
        new URLSearchParams(window.location.search).get("mode") === "stage",
      );
    };
    sync();
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);
  useEffect(() => {
    const keyboard = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (
        target.closest("input,textarea,select,[contenteditable=true]") ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey
      )
        return;
      if (["ArrowRight", "PageDown", " "].includes(event.key)) {
        if (event.key === " " && target.closest("button,a")) return;
        event.preventDefault();
        go(index + 1);
      } else if (["ArrowLeft", "PageUp"].includes(event.key)) {
        event.preventDefault();
        go(index - 1);
      } else if (event.key === "Home") {
        event.preventDefault();
        go(0);
      } else if (event.key === "End") {
        event.preventDefault();
        go(6);
      } else if (event.key.toLowerCase() === "p") setNotes((v) => !v);
      else if (event.key.toLowerCase() === "f") void fullscreen();
      else if (event.key === "?") setShortcuts((v) => !v);
      else if (event.key === "Escape") {
        setNotes(false);
        setShortcuts(false);
      }
    };
    window.addEventListener("keydown", keyboard);
    return () => window.removeEventListener("keydown", keyboard);
  }, [index, go, fullscreen]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 4000);
    return () => clearTimeout(timer);
  }, [notice]);
  return {
    index,
    stage,
    notes,
    setNotes,
    shortcuts,
    setShortcuts,
    notice,
    fullscreen,
    go,
    copy: async () => {
      try {
        await navigator.clipboard.writeText(window.location.href);
        setNotice("Slide link copied");
      } catch {
        setNotice("Copy this slide’s address from the browser bar.");
      }
    },
    onTouchStart: (e: React.TouchEvent) => {
      touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    },
    onTouchEnd: (e: React.TouchEvent) => {
      if (!touch.current) return;
      const dx = e.changedTouches[0].clientX - touch.current.x;
      const dy = e.changedTouches[0].clientY - touch.current.y;
      if (Math.abs(dx) > 65 && Math.abs(dx) > Math.abs(dy) * 1.5)
        go(index + (dx < 0 ? 1 : -1));
      touch.current = null;
    },
  };
}
