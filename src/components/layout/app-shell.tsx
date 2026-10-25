"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { AnimatePresence, motion, MotionConfig } from "motion/react";
import { ArrowUpRight, ChevronLeft, ShieldCheck } from "lucide-react";
import TwinCharacter from "@/components/twin-character/TwinCharacter";
import TwinStylePicker from "@/components/twin-character/TwinStylePicker";
import { useTwinStyle } from "@/components/twin-character/use-twin-style";
import { Dialog } from "@/components/ui/dialog";
import type { TwinProfile } from "@/lib/types";
import "./conference-shell.css";

export function Brand() {
  return (
    <Link href="/" className="brand" aria-label="MeaningfulMeet home">
      <span className="brand-symbol">
        <span />
        <span />
        <span />
      </span>
      <span>
        meaningful<span className="brand-meet">meet</span>
        <span className="brand-dot">.</span>
      </span>
    </Link>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const [twinOpen, setTwinOpen] = useState(false);
  const [profile, setProfile] = useState<TwinProfile | null>(null);
  const [profileError, setProfileError] = useState("");
  const [twinStyle, setTwinStyle] = useTwinStyle(profile?.id);
  const onboarding = path === "/";
  const inConference = path.includes("/event/");

  async function openTwin() {
    setTwinOpen(true);
    setProfileError("");
    try {
      const response = await fetch("/api/me/twin", { cache: "no-store" });
      if (!response.ok)
        throw Error("Your twin couldn’t load. Please try again.");
      setProfile(await response.json());
    } catch (e) {
      setProfileError(e instanceof Error ? e.message : "Please try again.");
    }
  }

  if (path.startsWith("/presentation"))
    return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
  return (
    <MotionConfig reducedMotion="user">
      <div
        className={`app-shell conference-shell ${onboarding ? "onboarding-shell" : ""} ${inConference ? "conference-active-shell" : ""}`}
      >
        <header className="site-header">
          <Brand />
          {!onboarding && (
            <Link href="/" className="conference-shell-event">
              <span>SF AI Summit</span>
              <small>YOUR CONFERENCE</small>
            </Link>
          )}
          <button
            className="shell-twin-button"
            onClick={() => void openTwin()}
            aria-label="Meet your digital twin"
          >
            <TwinCharacter size={36} mood="idle" style={twinStyle} />
            <span className="shell-twin-label">Your Digital Twin</span>
          </button>
        </header>
        <div className="workspace">
          <main>
            {!onboarding && !inConference && (
              <Link
                className="shell-return-conference"
                href="/event/evt_demo/network"
              >
                <ChevronLeft size={14} />
                Back to conference
              </Link>
            )}
            <AnimatePresence mode="wait">
              <motion.div
                key={path}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </main>
          <footer className="app-footer">
            <span>The AI networks. The human chooses.</span>
            <div>
              <span className="footer-demo">Fictional conference demo</span>
              <Link href="/omi-lab">Omi journal</Link>
              <Link href="/settings/privacy">Privacy</Link>
            </div>
          </footer>
        </div>
      </div>
      <Dialog
        open={twinOpen}
        onClose={() => setTwinOpen(false)}
        title="A little more you."
      >
        <div className="shell-twin-profile">
          <TwinCharacter
            size={140}
            mood="happy"
            interactive
            style={twinStyle}
          />
          <TwinStylePicker value={twinStyle} onChange={setTwinStyle} />
          <h3>
            {profile
              ? `${profile.name.split(" ")[0]}’s twin`
              : "Your conference companion"}
          </h3>
          <p>
            Your interests. Your boundaries.
            <br />A thoughtful way to meet your people.
          </p>
          {profile && (
            <div className="shell-twin-topics">
              {profile.expertise
                .filter(Boolean)
                .slice(0, 3)
                .map((topic) => (
                  <span key={topic}>{topic}</span>
                ))}
            </div>
          )}
          {profileError && (
            <p className="shell-twin-error" role="alert">
              {profileError}
            </p>
          )}
          <Link
            className="btn btn-primary"
            href="/twin/train"
            onClick={() => setTwinOpen(false)}
          >
            Make your twin more you <ArrowUpRight size={13} />
          </Link>
          <span className="shell-twin-private">
            <ShieldCheck size={12} />
            Only what you approve is shared.
          </span>
        </div>
      </Dialog>
    </MotionConfig>
  );
}
