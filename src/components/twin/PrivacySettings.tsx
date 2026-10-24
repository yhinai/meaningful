"use client";
import { useEffect, useState } from "react";
import { Check, LoaderCircle, RotateCcw, ShieldCheck } from "lucide-react";
import type { TwinProfile } from "@/lib/types";
import { PermissionControls } from "./TwinTraining";
import "./twin.css";
export default function PrivacySettings() {
  const [profile, setProfile] = useState<TwinProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetDone, setResetDone] = useState(false);
  useEffect(() => {
    fetch("/api/me/twin")
      .then(async (r) => {
        if (!r.ok)
          throw new Error(
            "Could not load privacy preferences. Please refresh.",
          );
        setProfile(await r.json());
      })
      .catch((e) => setError(e.message));
  }, []);
  async function save() {
    if (!profile) return;
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      const r = await fetch("/api/me/twin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions: profile.permissions }),
      });
      if (!r.ok)
        throw new Error("Could not update your preferences. Please try again.");
      setProfile(await r.json());
      setSaved(true);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not save. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }
  async function resetTwin() {
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/me/twin", { method: "DELETE" });
      if (!response.ok)
        throw new Error("Could not reset your twin. Please try again.");
      const next = await fetch("/api/me/twin");
      if (!next.ok)
        throw new Error("Your data was reset. Refresh to start again.");
      setProfile(await next.json());
      setConfirmReset(false);
      setSaved(false);
      setResetDone(true);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not reset. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="twin-page twin-privacy-list">
      <div className="twin-title-row">
        <div>
          <div className="twin-eyebrow">
            <ShieldCheck size={13} /> Always in your hands
          </div>
          <h1>Your privacy.</h1>
          <p className="twin-subtitle">
            Choose what your twin can share. Everything else stays private.
          </p>
        </div>
      </div>
      <section className="twin-card">
        <h2>Sharing preferences</h2>
        <p>
          Changes apply to future twin exchanges. Already-shared conversations
          cannot be recalled.
        </p>
        {profile ? (
          <PermissionControls
            permissions={profile.permissions}
            onChange={(permissions) => {
              setProfile({ ...profile, permissions });
              setSaved(false);
            }}
          />
        ) : (
          <div className="twin-loading">
            {error || "Loading your preferences…"}
          </div>
        )}
        <div className="twin-note">
          <ShieldCheck size={18} />
          <p>
            Your contact information is never shared by your twin. Introductions
            require approval from both people. This local demo stores your
            preferences on the server; it does not connect to external AI or
            enrichment providers.
          </p>
        </div>
        {error && profile && (
          <div className="twin-alert error" role="alert">
            {error}
          </div>
        )}
        {saved && (
          <div className="twin-alert success" role="status">
            <Check size={15} /> Your sharing preferences are saved.
          </div>
        )}
        <div className="twin-actions">
          <span />
          <button
            className="twin-button primary"
            onClick={save}
            disabled={!profile || saving}
          >
            {saving ? (
              <LoaderCircle size={14} className="twin-saving" />
            ) : (
              <ShieldCheck size={14} />
            )}
            {saving ? "Saving…" : "Save preferences"}
          </button>
        </div>
      </section>
      <section className="twin-card" style={{ marginTop: 20 }}>
        <h2>A fresh start</h2>
        <p>
          Remove your customized twin, saved goals, runs, and introductions for
          this demo profile. You will start with a blank profile and sharing
          turned off.
        </p>
        {resetDone && (
          <div className="twin-alert success" role="status">
            <Check size={15} /> Your twin data is removed. You can create a new
            twin anytime.
          </div>
        )}
        {confirmReset ? (
          <div
            className="twin-alert"
            role="alert"
            style={{ alignItems: "flex-start", flexDirection: "column" }}
          >
            <span>This removes your current demo twin data. Continue?</span>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                className="twin-button"
                onClick={() => setConfirmReset(false)}
                disabled={saving}
              >
                Keep my twin
              </button>
              <button
                className="twin-button"
                onClick={resetTwin}
                disabled={saving}
              >
                {saving ? "Resetting…" : "Yes, reset my twin"}
              </button>
            </div>
          </div>
        ) : (
          <button
            className="twin-button text"
            onClick={() => {
              setConfirmReset(true);
              setResetDone(false);
            }}
            disabled={saving}
          >
            <RotateCcw size={14} /> Reset my twin
          </button>
        )}
      </section>
    </div>
  );
}
