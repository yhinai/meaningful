"use client";
import { useEffect, useState } from "react";
import { ImagePlus, LoaderCircle, Search, Sparkles } from "lucide-react";
import type { Fieldnotes, NoteVisual } from "@/features/fieldnotes/model";

export default function MagazineVisuals({
  endpoint,
  revision,
  disabled,
  onChange,
}: {
  endpoint: string;
  revision: number;
  disabled: boolean;
  onChange: (journal: Fieldnotes) => void;
}) {
  const [query, setQuery] = useState("thoughtful conversation collaboration");
  const [configured, setConfigured] = useState(false);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [photos, setPhotos] = useState<NoteVisual[]>([]);
  const [searched, setSearched] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch(endpoint, { cache: "no-store", signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data) setConfigured(data.configured);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [endpoint]);
  async function search() {
    setBusy("search");
    setError("");
    try {
      const response = await fetch(
        `${endpoint}?query=${encodeURIComponent(query)}`,
        { cache: "no-store" },
      );
      const data = await response.json();
      if (!response.ok)
        throw Error(data.error || "Photo search is unavailable.");
      setPhotos(data.photos);
      setConfigured(data.configured);
      setSearched(true);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Try again.");
    } finally {
      setBusy("");
    }
  }
  async function update(visual?: NoteVisual) {
    setBusy(visual ? "select" : "generate");
    setError("");
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          visual
            ? { action: "select", revision, visual }
            : { action: "generate", revision, query, consent: true },
        ),
      });
      const result = await response.json();
      if (!response.ok)
        throw Error(result.error || "Could not add this image.");
      onChange(result);
      setConsent(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Try again.");
    } finally {
      setBusy("");
    }
  }
  return (
    <details className="mn-visual-tools">
      <summary>
        <ImagePlus size={16} /> Pictures for your edition
      </summary>
      <p>
        Find a credited online photograph, or generate a conceptual AI image.
        Pictures illustrate the subject; they are not photographs of your
        meeting.
      </p>
      <label htmlFor="mn-photo-query">Public subject to illustrate</label>
      <input
        id="mn-photo-query"
        value={query}
        disabled={!!busy || disabled}
        maxLength={160}
        onChange={(event) => setQuery(event.target.value)}
      />
      <p className="fn-small">
        Only these subject words are sent to Wikimedia or Gemini. Your
        transcript and private notes stay out of image requests.
      </p>
      {disabled && (
        <p className="fn-small">
          Save your follow-up changes before adding pictures.
        </p>
      )}
      <div className="mn-demo-actions">
        <button
          className="fn-button fn-secondary"
          disabled={!!busy || disabled || query.trim().length < 2}
          onClick={() => void search()}
        >
          {busy === "search" ? (
            <LoaderCircle className="fn-spin" size={14} />
          ) : (
            <Search size={14} />
          )}{" "}
          Find online photos
        </button>
        <button
          className="fn-button"
          disabled={
            !!busy ||
            disabled ||
            !configured ||
            !consent ||
            query.trim().length < 2
          }
          onClick={() => void update()}
        >
          {busy === "generate" ? (
            <LoaderCircle className="fn-spin" size={14} />
          ) : (
            <Sparkles size={14} />
          )}
          {busy === "generate" ? "Creating your image…" : "Generate AI image"}
        </button>
      </div>
      {configured ? (
        <label className="fn-consent">
          <input
            type="checkbox"
            checked={consent}
            disabled={!!busy || disabled}
            onChange={(event) => setConsent(event.target.checked)}
          />{" "}
          Generate an image with the configured Gemini account. Normal API
          charges apply.
        </label>
      ) : (
        <p className="fn-small">
          AI images aren’t connected yet. Online photo search is available
          without a Gemini key.
        </p>
      )}
      {error && (
        <p className="fn-alert" role="alert">
          {error}
        </p>
      )}
      {searched && !photos.length && (
        <p className="fn-small">
          No reusable photos found. Try a broader public subject.
        </p>
      )}
      <div className="mn-photo-results">
        {photos.map((photo) => (
          <article key={photo.url}>
            <img
              src={photo.url}
              alt={photo.alt}
              loading="lazy"
              referrerPolicy="no-referrer"
            />
            <div>
              <p>{photo.alt}</p>
              <small>
                {photo.credit} · {photo.license}
              </small>
              <a href={photo.sourceUrl} target="_blank" rel="noreferrer">
                Source & license
              </a>
              <button
                className="fn-button fn-secondary"
                disabled={!!busy || disabled}
                onClick={() => void update(photo)}
              >
                Use this photo
              </button>
            </div>
          </article>
        ))}
      </div>
    </details>
  );
}
