"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCheck,
  Eye,
  LoaderCircle,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type { SharePermissions, TwinProfile } from "@/lib/types";
import "./twin.css";

const permissionLabels: Record<keyof SharePermissions, [string, string]> = {
  bio: ["Your introduction", "Your bio and professional background."],
  company: ["Your company", "The company or project you are working on."],
  expertise: ["Your expertise", "Skills and experience you choose to share."],
  offers: ["What you can offer", "The ways you can help another attendee."],
  seeks: [
    "What you are looking for",
    "The connections you would like to make.",
  ],
  topics: [
    "Conference goals & interests",
    "Your event-specific goals and interests.",
  ],
};

export function PermissionControls({
  permissions,
  onChange,
}: {
  permissions: SharePermissions;
  onChange: (value: SharePermissions) => void;
}) {
  return (
    <>
      {(Object.keys(permissionLabels) as (keyof SharePermissions)[]).map(
        (key) => (
          <div className="twin-switch-row" key={key}>
            <div>
              <strong>{permissionLabels[key][0]}</strong>
              <p>{permissionLabels[key][1]}</p>
            </div>
            <button
              type="button"
              className={`twin-toggle ${permissions[key] ? "on" : ""}`}
              role="switch"
              aria-checked={permissions[key]}
              aria-label={`Share ${permissionLabels[key][0].toLowerCase()}`}
              onClick={() =>
                onChange({ ...permissions, [key]: !permissions[key] })
              }
            >
              <span />
            </button>
          </div>
        ),
      )}
    </>
  );
}

export default function TwinTraining() {
  const [profile, setProfile] = useState<TwinProfile | null>(null);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    fetch("/api/me/twin")
      .then(async (response) => {
        if (!response.ok)
          throw new Error(
            "Could not load your twin. Please refresh to try again.",
          );
        setProfile(await response.json());
      })
      .catch((e) => setError(e.message));
  }, []);
  const edit = <K extends keyof TwinProfile>(key: K, value: TwinProfile[K]) => {
    setSaved(false);
    setProfile((previous) =>
      previous ? { ...previous, [key]: value } : previous,
    );
  };
  async function save() {
    if (!profile) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/me/twin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(
          result.error || "Your twin could not be saved. Please try again.",
        );
      }
      setProfile(await response.json());
      setSaved(true);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }
  if (!profile)
    return (
      <div className="twin-page">
        <div className="twin-loading">
          {error || "Getting to know your twin…"}
        </div>
      </div>
    );
  return (
    <div className="twin-page">
      <div className="twin-title-row">
        <div>
          <div className="twin-eyebrow">
            <Sparkles size={13} /> A little more you
          </div>
          <h1>Your twin, in your words.</h1>
          <p className="twin-subtitle">
            Tell your twin who you are and what matters to you. You choose what
            it can share.
          </p>
        </div>
      </div>
      <div className="twin-grid">
        <section className="twin-card">
          <ol className="twin-steps" aria-label="Training progress">
            {["Your story", "Your intent", "Your boundaries"].map(
              (label, i) => (
                <li
                  key={label}
                  className={`twin-step ${i === step ? "active" : ""}`}
                  aria-current={step === i ? "step" : undefined}
                >
                  <span>{i < step ? <Check size={12} /> : i + 1}</span>
                  {label}
                </li>
              ),
            )}
          </ol>
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.22 }}
            >
              <h2>
                {
                  [
                    "Tell your story.",
                    "Make your intentions meaningful.",
                    "Share only what feels right.",
                  ][step]
                }
              </h2>
              <p>
                {
                  [
                    "The essentials that help your twin represent you thoughtfully.",
                    "Your lasting interests. You can set specific conference goals next.",
                    "Your twin only exchanges the categories you approve here.",
                  ][step]
                }
              </p>
              {step === 0 && (
                <div className="twin-form">
                  <div className="twin-field">
                    <label htmlFor="twin-name">Your name</label>
                    <input
                      id="twin-name"
                      value={profile.name}
                      maxLength={100}
                      onChange={(e) => edit("name", e.target.value)}
                      autoComplete="name"
                    />
                  </div>
                  <div className="twin-field-row">
                    <div className="twin-field">
                      <label htmlFor="twin-role">Role</label>
                      <input
                        id="twin-role"
                        value={profile.role}
                        onChange={(e) => edit("role", e.target.value)}
                      />
                    </div>
                    <div className="twin-field">
                      <label htmlFor="twin-company">Company or project</label>
                      <input
                        id="twin-company"
                        value={profile.company}
                        onChange={(e) => edit("company", e.target.value)}
                        autoComplete="organization"
                      />
                    </div>
                  </div>
                  <div className="twin-field">
                    <label htmlFor="twin-bio">A little about you</label>
                    <textarea
                      id="twin-bio"
                      value={profile.bio}
                      maxLength={2000}
                      onChange={(e) => edit("bio", e.target.value)}
                    />
                    <small>
                      Write a few lines or paste a short bio. Keep personal
                      contact information private.
                    </small>
                  </div>
                  <div className="twin-field">
                    <label htmlFor="twin-skills">Your areas of expertise</label>
                    <input
                      id="twin-skills"
                      value={profile.expertise.join(", ")}
                      onChange={(e) =>
                        edit(
                          "expertise",
                          e.target.value.split(",").map((s) => s.trimStart()),
                        )
                      }
                    />
                    <small>Separate your skills with commas.</small>
                  </div>
                </div>
              )}
              {step === 1 && (
                <div className="twin-form">
                  <div className="twin-field">
                    <label htmlFor="twin-offers">
                      What can you bring to a conversation?
                    </label>
                    <textarea
                      id="twin-offers"
                      value={profile.offers}
                      maxLength={2000}
                      onChange={(e) => edit("offers", e.target.value)}
                      placeholder="Experience, perspective, a helping hand…"
                    />
                  </div>
                  <div className="twin-field">
                    <label htmlFor="twin-seeks">
                      What are you hoping to find?
                    </label>
                    <textarea
                      id="twin-seeks"
                      value={profile.seeks}
                      maxLength={2000}
                      onChange={(e) => edit("seeks", e.target.value)}
                    />
                  </div>
                  <div className="twin-field">
                    <label htmlFor="twin-style">Your conversation style</label>
                    <select
                      id="twin-style"
                      value={profile.conversationStyle}
                      onChange={(e) =>
                        edit("conversationStyle", e.target.value)
                      }
                    >
                      {[
                        "Thoughtful and curious",
                        "Direct and focused",
                        "Open and exploratory",
                        "Relaxed and informal",
                      ].map((style) => (
                        <option key={style}>{style}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
              {step === 2 && (
                <div className="twin-form">
                  <PermissionControls
                    permissions={profile.permissions}
                    onChange={(value) => edit("permissions", value)}
                  />
                  <div className="twin-field">
                    <label htmlFor="twin-avoid">
                      Any topics you would rather avoid?
                    </label>
                    <textarea
                      id="twin-avoid"
                      value={profile.topicsToAvoid}
                      maxLength={1000}
                      onChange={(e) => edit("topicsToAvoid", e.target.value)}
                      placeholder="Optional. Your twin will respect these boundaries."
                    />
                  </div>
                  <div className="twin-note">
                    <ShieldCheck size={17} />
                    <p>
                      Sharing is always your choice. Your twin cannot book a
                      meeting or share your contact details. You can change
                      these permissions anytime.
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
          {error && (
            <div className="twin-alert error" role="alert">
              {error}
            </div>
          )}
          {saved && (
            <div className="twin-alert success" role="status">
              <CheckCheck size={16} /> Your twin is updated. You are ready to
              connect.
            </div>
          )}
          <div className="twin-actions">
            {step > 0 ? (
              <button
                className="twin-button text"
                onClick={() => setStep(step - 1)}
              >
                <ArrowLeft size={14} /> Back
              </button>
            ) : (
              <span />
            )}
            {step < 2 ? (
              <button
                className="twin-button primary"
                onClick={() => setStep(step + 1)}
              >
                Continue <ArrowRight size={14} />
              </button>
            ) : saved ? (
              <Link
                href="/event/evt_demo/goals"
                className="twin-button primary"
              >
                Set conference goals <ArrowRight size={14} />
              </Link>
            ) : (
              <button
                className="twin-button primary"
                onClick={save}
                disabled={saving || !profile.name.trim()}
              >
                {saving ? (
                  <LoaderCircle size={14} className="twin-saving" />
                ) : (
                  <Sparkles size={14} />
                )}
                {saving ? "Saving your twin…" : "Save my twin"}
              </button>
            )}
          </div>
        </section>
        <aside className="twin-card twin-preview">
          <div className="twin-eyebrow" style={{ justifyContent: "center" }}>
            <Eye size={12} /> What other twins see
          </div>
          <div className="twin-avatar">
            {profile.name
              .split(" ")
              .map((word) => word[0])
              .slice(0, 2)
              .join("")}
          </div>
          <h3>{profile.name || "Your name"}</h3>
          <div className="twin-role">
            {profile.role}
            {profile.permissions.company && profile.company
              ? ` at ${profile.company}`
              : ""}
          </div>
          {profile.permissions.expertise && (
            <div className="twin-chips">
              {profile.expertise
                .filter(Boolean)
                .slice(0, 4)
                .map((skill, index) => (
                  <span className="twin-chip" key={`${skill}-${index}`}>
                    {skill}
                  </span>
                ))}
            </div>
          )}
          {profile.permissions.bio && <p>{profile.bio}</p>}
          {profile.permissions.offers && (
            <>
              <div className="twin-preview-divider" />
              <div
                className="twin-eyebrow"
                style={{ justifyContent: "center" }}
              >
                Bringing to the table
              </div>
              <p>{profile.offers}</p>
            </>
          )}
          <div className="twin-preview-divider" />
          <p className="twin-preview-foot">
            <ShieldCheck size={12} /> Only your approved information is shared.
          </p>
        </aside>
      </div>
    </div>
  );
}
