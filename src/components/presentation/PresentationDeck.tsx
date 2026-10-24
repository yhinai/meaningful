"use client";
import { useEffect, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Maximize2,
  Link2,
  X,
  Command,
  Presentation,
  Sparkles,
} from "lucide-react";
import { GraphSlide } from "./NetworkVisuals";
import {
  ProblemSlide,
  TrainSlide,
  MeetSlide,
  MagazineSlide,
} from "./StorySlides";
import { slides, technologyIntegrations } from "./deck-data";
import { useDeckNavigation } from "./use-deck-navigation";
import "./presentation.css";
import "./editorial.css";
import { PhotoHero } from "./PhotoHero";

function Symbol({ large = false }: { large?: boolean }) {
  return (
    <svg
      className={large ? "pres-symbol pres-symbol-large" : "pres-symbol"}
      viewBox="0 0 44 32"
      fill="none"
      aria-hidden="true"
    >
      <path d="M9 23C17 23 25 9 35 9" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="9" cy="23" r="5" fill="currentColor" />
      <circle cx="35" cy="9" r="5" fill="currentColor" />
      <circle
        cx="22"
        cy="16"
        r="3"
        fill="#fff"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}
function HookSlide({ begin }: { begin: () => void }) {
  return (
    <div className="pres-hook">
      <div className="pres-hero-copy">
        <div className="pres-eyebrow">
          <span /> A LITTLE MORE HUMAN
        </div>
        <h1>
          Hundreds of people.
          <br />
          One <em>meaningful</em>
          <br />
          connection.
        </h1>
        <p>
          An AI twin that knows your goals.
          <br className="pres-desktop-break" /> Finds your people. Leaves the
          hello to you.
        </p>
        <button className="pres-primary" onClick={begin}>
          Discover the possibility <ArrowRight size={17} />
        </button>
        <div className="pres-hero-caption">
          <span>01 — 07</span> A new way to find your people.
        </div>
      </div>
      <div className="pres-hero-art">
        <div className="pres-art-label">
          <span className="pres-tiny-star">✳</span> GOOD CONNECTIONS AREN’T AN
          ACCIDENT.
        </div>
        <PhotoHero />
        <div className="pres-art-bottom">
          <span>AI twins. Real conversations.</span>
          <span>Illustrative demo</span>
        </div>
      </div>
    </div>
  );
}
function CloseSlide() {
  return (
    <div className="pres-close">
      <div className="pres-eyebrow">BUILT TO PATCH CONFERENCES</div>
      <Symbol large />
      <h1>
        Meaningful<span>Meet</span>
        <i>.</i>
      </h1>
      <p className="pres-close-tagline">
        Your AI networks. You connect.
        <br />
        <em>Your story lives on.</em>
      </p>
      <div className="pres-close-actions">
        <a
          className="pres-primary"
          href="/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Open live demo <ArrowUpRight size={17} />
        </a>
        <a
          className="pres-secondary"
          href="/event/evt_demo/network"
          target="_blank"
          rel="noopener noreferrer"
        >
          View network graph <ArrowUpRight size={17} />
        </a>
      </div>
      <div className="pres-sponsor-heading">
        TECHNOLOGY INTEGRATIONS{" "}
        <span>Intended roles · implementation status unverified</span>
      </div>
      <div className="pres-sponsors">
        {technologyIntegrations.map((item) => (
          <div key={item.name}>
            <strong>{item.name}</strong>
            <p>{item.role}</p>
            <small>{item.status}</small>
          </div>
        ))}
      </div>
      <p className="pres-close-line">
        Less random networking. More meaningful meetings.
      </p>
    </div>
  );
}
function Overlay({
  title,
  close,
  children,
}: {
  title: string;
  close: () => void;
  children: React.ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    return () => previous?.focus();
  }, []);
  return (
    <div className="pres-overlay" onClick={close}>
      <div
        className="pres-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        ref={panel}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Tab") {
            const items = panel.current?.querySelectorAll<HTMLElement>(
              'button,a,[tabindex="0"]',
            );
            if (!items?.length) {
              e.preventDefault();
              return;
            }
            const first = items[0],
              last = items[items.length - 1];
            if (
              e.shiftKey &&
              (document.activeElement === first ||
                document.activeElement === panel.current)
            ) {
              e.preventDefault();
              last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
              e.preventDefault();
              first.focus();
            }
          }
        }}
      >
        <div className="pres-dialog-top">
          <span>{title}</span>
          <button onClick={close} aria-label="Close dialog">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
export default function PresentationDeck() {
  const nav = useDeckNavigation();
  const reduced = useReducedMotion();
  const slide = slides[nav.index];
  const contents = [
    <HookSlide key="hook" begin={() => nav.go(1)} />,
    <ProblemSlide key="problem" />,
    <TrainSlide key="train" />,
    <GraphSlide key="graph" />,
    <MeetSlide key="meet" />,
    <MagazineSlide key="magazine" />,
    <CloseSlide key="close" />,
  ];
  return (
    <div className={`pres-deck ${nav.stage ? "pres-stage" : ""}`}>
      <header className="pres-header">
        <a
          href="/presentation"
          className="pres-brand"
          aria-label="MeaningfulMeet presentation home"
        >
          <Symbol />
          <span>
            meaningful<span>meet</span>
            <i>.</i>
          </span>
        </a>
        <div className="pres-event">
          <span>PATCH THE CONFERENCE</span>
          <span className="pres-event-divider" /> SAN FRANCISCO, 2026
        </div>
        <a
          className="pres-demo-link"
          href="/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Explore the app <ArrowUpRight size={14} />
        </a>
      </header>
      <main
        className="pres-main"
        onTouchStart={nav.onTouchStart}
        onTouchEnd={nav.onTouchEnd}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.section
            key={nav.index}
            className={`pres-slide pres-slide-${nav.index + 1}`}
            aria-label={`Slide ${nav.index + 1}: ${slide.title}`}
            initial={{
              opacity: 0,
              y: reduced ? 0 : 16,
              filter: reduced ? "none" : "blur(3px)",
            }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: reduced ? 0 : -10 }}
            transition={{
              duration: reduced ? 0 : 0.38,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            {contents[nav.index]}
          </motion.section>
        </AnimatePresence>
      </main>
      <footer className="pres-footer">
        <div className="pres-footer-top">
          <div className="pres-chapter">
            <span>{String(nav.index + 1).padStart(2, "0")}</span>
            <span className="pres-chapter-divider" />
            <span>{slide.section}</span>
          </div>
          <div className="pres-tools">
            <button
              onClick={() => nav.setShortcuts(true)}
              aria-label="Keyboard shortcuts"
              title="Keyboard shortcuts (?)"
            >
              <Command size={15} />
            </button>
            <button
              onClick={() => nav.setNotes(true)}
              aria-label="Presenter notes"
              title="Presenter notes (P)"
            >
              <Presentation size={16} />
            </button>
            <button
              onClick={nav.copy}
              aria-label="Copy slide link"
              title="Copy slide link"
            >
              <Link2 size={16} />
            </button>
            <button
              onClick={nav.fullscreen}
              aria-label="Toggle fullscreen"
              title="Fullscreen (F)"
            >
              <Maximize2 size={15} />
            </button>
          </div>
          <div className="pres-nav">
            <span>
              {String(nav.index + 1).padStart(2, "0")} <i>/ 07</i>
            </span>
            <button
              disabled={nav.index === 0}
              onClick={() => nav.go(nav.index - 1)}
              aria-label="Previous slide"
            >
              <ArrowLeft size={18} />
            </button>
            <button
              disabled={nav.index === 6}
              onClick={() => nav.go(nav.index + 1)}
              aria-label="Next slide"
            >
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
        <nav className="pres-progress" aria-label="Presentation slides">
          {slides.map((item, i) => (
            <button
              key={item.title}
              className={
                i === nav.index
                  ? "is-active"
                  : i < nav.index
                    ? "is-complete"
                    : ""
              }
              aria-label={`Slide ${i + 1}: ${item.title}`}
              aria-current={i === nav.index ? "step" : undefined}
              onClick={() => nav.go(i)}
            >
              <span />
            </button>
          ))}
        </nav>
        <div className="pres-footer-bottom">
          <span>YOUR AI NETWORKS. YOU CONNECT.</span>
          <span>PATCH THE CONFERENCE · OCTOBER 24, 2026</span>
          <span>DESIGNED FOR MEANING.</span>
        </div>
      </footer>
      <span className="pres-sr-only" aria-live="polite">
        Slide {nav.index + 1} of 7. {slide.title}
      </span>
      {nav.notice && (
        <div className="pres-toast" role="status">
          {nav.notice}
        </div>
      )}
      {nav.notes && (
        <Overlay title="Presenter notes" close={() => nav.setNotes(false)}>
          <div className="pres-notes-meta">
            <span>
              {String(nav.index + 1).padStart(2, "0")} / 07 · {slide.duration}
            </span>
            <span>3 MINUTE PITCH</span>
          </div>
          <h2>{slide.title}</h2>
          <p>{slide.notes}</p>
          <div className="pres-notes-next">
            <Sparkles size={16} />{" "}
            {nav.index < 6
              ? `Up next: ${slides[nav.index + 1].title}`
              : "Finish here, or open the live demo."}
          </div>
        </Overlay>
      )}
      {nav.shortcuts && (
        <Overlay
          title="Make yourself at home"
          close={() => nav.setShortcuts(false)}
        >
          <h2>A few shortcuts.</h2>
          <div className="pres-shortcuts">
            {[
              ["Next / previous", "← → · Space · Page keys"],
              ["First / last slide", "Home / End"],
              ["Fullscreen", "F"],
              ["Presenter notes", "P"],
              ["Show shortcuts", "?"],
              ["Close panel", "Esc"],
            ].map(([label, keys]) => (
              <div key={label}>
                <span>{label}</span>
                <kbd>{keys}</kbd>
              </div>
            ))}
          </div>
          <p className="pres-shortcut-tip">
            On touch screens, swipe sideways to change slides.
          </p>
        </Overlay>
      )}
    </div>
  );
}
