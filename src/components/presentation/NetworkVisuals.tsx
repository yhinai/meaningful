"use client";

import { useEffect, useId, useState } from "react";
import {
  ArrowUpRight,
  Check,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import "./network-visuals.css";

const points = Array.from({ length: 45 }, (_, i) => {
  const angle = i * 2.399963;
  const radius = 62 + Math.sqrt(i / 44) * 203;
  return {
    x: 330 + Math.cos(angle) * radius,
    y: 274 + Math.sin(angle) * radius * 0.83,
    r: 2.5 + (i % 4) * 1.4,
  };
});

function Portrait({
  x,
  y,
  size,
  person = 0,
}: {
  x: number;
  y: number;
  size: number;
  person?: number;
}) {
  const uid = useId().replace(/:/g, "");
  const palettes = [
    ["#e6d3ba", "#6c4c3e", "#d2ac8e", "#4c4641"],
    ["#e8e2da", "#322b29", "#c18b68", "#e8e2d5"],
    ["#e0d9ce", "#493b34", "#e0b49b", "#393531"],
  ];
  const [bg, hair, skin, shirt] = palettes[person % 3];
  return (
    <svg
      x={x - size / 2}
      y={y - size / 2}
      width={size}
      height={size}
      viewBox="0 0 100 100"
      aria-hidden="true"
    >
      <defs>
        <clipPath id={uid}>
          <circle cx="50" cy="50" r="49" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${uid})`}>
        <rect width="100" height="100" fill={bg} />
        <ellipse cx="50" cy="107" rx="39" ry="42" fill={shirt} />
        <path d="M41 61h18v19c-3 8-15 8-18 0z" fill={skin} />
        <ellipse cx="50" cy="43" rx="21" ry="28" fill={hair} />
        <ellipse cx="50" cy="47" rx="17" ry="23" fill={skin} />
        <path
          d={
            person === 0
              ? "M30 43c-3-30 38-39 41-7-13-3-24-9-30-12 0 8-3 14-11 19Z"
              : "M32 40c-6-34 41-36 36-1-11-3-18-10-21-14-1 8-7 13-15 15Z"
          }
          fill={hair}
        />
        <path
          d="M44 57q6 5 12 0"
          fill="none"
          stroke="#9c6554"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <circle cx="43" cy="46" r="1.4" fill="#49352d" />
        <circle cx="57" cy="46" r="1.4" fill="#49352d" />
        <path d="M49 48l-2 6h5" fill="none" stroke="#ad795f" strokeWidth="1" />
      </g>
      <circle
        cx="50"
        cy="50"
        r="49"
        stroke="white"
        strokeWidth="2"
        fill="none"
      />
    </svg>
  );
}

export function CrowdConnections() {
  return (
    <div
      className="pres-crowd"
      aria-label="Illustration of two people finding a meaningful connection in a crowd"
    >
      <div className="pres-orbit-caption">
        <span className="pres-status-dot" /> A little less chance. A lot more
        possibility.
      </div>
      <svg
        className="pres-crowd-svg"
        viewBox="0 0 660 550"
        role="img"
        aria-label="A constellation of attendees, with Alex and Jordan connected"
      >
        <defs>
          <radialGradient id="pres-crowd-glow">
            <stop stopColor="#eee7dc" stopOpacity=".85" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="pres-connect-line">
            <stop stopColor="#c5b296" />
            <stop offset="1" stopColor="#78654f" />
          </linearGradient>
        </defs>
        <ellipse
          cx="330"
          cy="275"
          rx="300"
          ry="255"
          fill="url(#pres-crowd-glow)"
        />
        {[100, 172, 240].map((r) => (
          <ellipse
            key={r}
            cx="330"
            cy="274"
            rx={r}
            ry={r * 0.83}
            fill="none"
            stroke="#e7e1d9"
            strokeWidth="1"
          />
        ))}
        <path
          d="M50 274h560M330 40v466"
          stroke="#f0ece5"
          strokeDasharray="3 7"
        />
        {points.map((p, i) => (
          <g
            key={i}
            className="pres-crowd-dot"
            style={{ animationDelay: `${i * -0.22}s` }}
          >
            <circle cx={p.x} cy={p.y} r={p.r + 5} fill="#f7f4ef" />
            <circle
              cx={p.x}
              cy={p.y}
              r={p.r}
              fill={i % 3 === 0 ? "#c9b89f" : "#ded8cf"}
            />
          </g>
        ))}
        <path
          className="pres-connection-path"
          d="M230 324C262 188 356 171 437 223"
          stroke="url(#pres-connect-line)"
          strokeWidth="2"
          fill="none"
        />
        <path
          d="M230 324C262 188 356 171 437 223"
          stroke="#ac9780"
          strokeWidth="12"
          fill="none"
          opacity=".08"
        />
        <circle
          className="pres-orbit-pulse"
          cx="230"
          cy="324"
          r="54"
          stroke="#d0bea3"
          fill="none"
        />
        <circle cx="230" cy="324" r="48" fill="white" />
        <Portrait x={230} y={324} size={86} person={0} />
        <circle
          className="pres-orbit-pulse"
          cx="437"
          cy="223"
          r="48"
          stroke="#d0bea3"
          fill="none"
        />
        <circle cx="437" cy="223" r="42" fill="white" />
        <Portrait x={437} y={223} size={74} person={1} />
        <circle cx="332" cy="218" r="18" fill="#75614b" />
        <path
          d="m325 218 5 5 10-11"
          fill="none"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <g transform="translate(270 409)">
          <rect width="129" height="28" rx="14" fill="white" stroke="#e7e0d5" />
          <circle cx="16" cy="14" r="3" fill="#a48d6d" />
          <text
            x="28"
            y="18"
            fontSize="9"
            fill="#81705d"
            fontFamily="sans-serif"
            letterSpacing="1.5"
          >
            HUMAN, BY DESIGN
          </text>
        </g>
      </svg>
      <div className="pres-float-card pres-float-alex">
        <div className="pres-mini-avatar">AM</div>
        <div>
          <strong>Alex Morgan</strong>
          <span>Product mind. Big ideas.</span>
        </div>
        <span className="pres-card-spark">✧</span>
      </div>
      <div className="pres-float-card pres-float-jordan">
        <span className="pres-match-mark">
          <Check size={13} />
        </span>
        <div>
          <strong>A meaningful match.</strong>
          <span>Different skills. Shared ambition.</span>
        </div>
      </div>
      <span className="pres-crowd-demo">Illustrative demo profiles</span>
    </div>
  );
}

const graphNodes = Array.from({ length: 20 }, (_, i) => {
  const angle = (i / 20) * Math.PI * 2 - Math.PI / 2;
  const radius = i % 2 === 0 ? 155 : 205;
  return {
    x: 280 + Math.cos(angle) * radius,
    y: 235 + Math.sin(angle) * radius * 0.85,
    initials: [
      "JL",
      "SK",
      "MR",
      "AC",
      "EL",
      "DW",
      "NC",
      "RT",
      "AK",
      "SP",
      "TN",
      "LP",
      "KB",
      "JA",
      "OS",
      "CL",
      "RD",
      "EW",
      "MB",
      "ZH",
    ][i],
  };
});
const phases = [
  "Scouting the room",
  "Starting three conversations",
  "Finding shared potential",
  "Your approval comes next",
];

export function GraphSlide() {
  const [step, setStep] = useState(3);
  const [running, setRunning] = useState(false);
  const [discovered, setDiscovered] = useState(20);
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(
      () => {
        if (discovered < 20) {
          setDiscovered((n) => n + 1);
          return;
        }
        if (step < 3) {
          setStep((n) => n + 1);
          return;
        }
        setRunning(false);
      },
      discovered < 20 ? 115 : 1900,
    );
    return () => window.clearInterval(timer);
  }, [running, discovered, step]);
  const replay = () => {
    setStep(0);
    setDiscovered(0);
    setRunning(true);
  };
  return (
    <div className="pres-network-slide">
      <div className="pres-network-heading">
        <div>
          <p className="pres-network-eyebrow">04 / THE INTELLIGENCE</p>
          <h2>
            Your twin networks.
            <br />
            <em>You stay human.</em>
          </h2>
        </div>
        <span className="pres-illustrative">
          <span /> Illustrative demo
        </span>
      </div>
      <div className="pres-network-layout">
        <div className="pres-network-canvas">
          <svg
            viewBox="0 0 560 465"
            role="img"
            aria-label={`${discovered} discovered candidates, ${step > 0 ? 3 : 0} conversations, ${step > 1 ? 1 : 0} recommended match`}
          >
            {[95, 155, 205].map((r) => (
              <ellipse
                key={r}
                cx="280"
                cy="235"
                rx={r}
                ry={r * 0.85}
                fill="none"
                stroke="#ece5da"
                strokeDasharray={r === 95 ? "3 5" : undefined}
              />
            ))}
            {graphNodes.slice(0, discovered).map((n, i) => {
              const active = [0, 6, 13].includes(i) && step > 0;
              return (
                <g key={i} className="pres-graph-node">
                  <line
                    x1="280"
                    y1="235"
                    x2={n.x}
                    y2={n.y}
                    stroke={active ? "#a28c6d" : "#e8e1d6"}
                    strokeWidth={active ? 1.8 : 0.8}
                    strokeDasharray={active && running ? "5 5" : undefined}
                    className={active && running ? "pres-graph-signal" : ""}
                  />
                  <circle
                    cx={n.x}
                    cy={n.y}
                    r={i === 0 && step > 1 ? 28 : active ? 23 : 17}
                    fill={i === 0 && step > 1 ? "#75614b" : "#fff"}
                    stroke={active ? "#bda98c" : "#e6ddd0"}
                  />
                  <text
                    x={n.x}
                    y={n.y + 4}
                    textAnchor="middle"
                    fontSize={active ? "11" : "8"}
                    fill={i === 0 && step > 1 ? "#fff" : "#8a7b68"}
                    fontFamily="sans-serif"
                  >
                    {n.initials}
                  </text>
                  {i === 0 && step > 1 && (
                    <g>
                      <circle
                        cx={n.x + 21}
                        cy={n.y - 19}
                        r="9"
                        fill="#fff"
                        stroke="#c2b195"
                      />
                      <path
                        d={`m${n.x + 17} ${n.y - 19} 3 3 5-6`}
                        stroke="#75614b"
                        fill="none"
                        strokeWidth="1.5"
                      />
                    </g>
                  )}
                </g>
              );
            })}
            <circle cx="280" cy="235" r="48" fill="#f1e9dd" />
            <circle cx="280" cy="235" r="37" fill="#75614b" />
            <path
              d="M265 231h9m12 8h9m-21-8 12 8"
              stroke="white"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
            <circle cx="265" cy="231" r="4" fill="white" />
            <circle cx="295" cy="239" r="4" fill="white" />
            <circle cx="286" cy="239" r="3" fill="white" />
            <text
              x="280"
              y="299"
              textAnchor="middle"
              fontSize="10"
              fill="#75614b"
              fontFamily="sans-serif"
              letterSpacing="1.5"
            >
              YOUR TWIN
            </text>
          </svg>
          <div className="pres-graph-bubble">
            <span>✧</span>
            {step === 0
              ? "Who can help you build what’s next?"
              : step === 1
                ? "I build agent systems. Looking for a product partner."
                : "Different strengths. The same ambition."}
          </div>
          <div className="pres-replay-bar">
            <span role="status" aria-live="polite">
              <i />
              {phases[step]}
            </span>
            <button
              onClick={running ? () => setRunning(false) : replay}
              aria-label={
                running
                  ? "Pause network replay"
                  : "Replay twenty to three to one"
              }
            >
              {running ? <Pause size={13} /> : <RotateCcw size={13} />}{" "}
              {running ? "Pause" : "Replay 20 → 3 → 1"}
            </button>
            {!running && discovered < 20 && (
              <button
                onClick={() => setRunning(true)}
                aria-label="Resume replay"
              >
                <Play size={13} />
              </button>
            )}
          </div>
        </div>
        <div className="pres-network-inspector">
          <div className="pres-network-metrics">
            <div>
              <strong>{discovered}</strong>
              <span>discovered</span>
            </div>
            <span>→</span>
            <div>
              <strong>{step > 0 ? "3" : "0"}</strong>
              <span>conversations</span>
            </div>
            <span>→</span>
            <div>
              <strong>{step > 1 ? "1" : "0"}</strong>
              <span>great match</span>
            </div>
          </div>
          <div
            className={`pres-match-card ${step > 1 ? "pres-match-ready" : ""}`}
          >
            <div className="pres-match-top">
              <span>
                <Sparkles size={13} />{" "}
                {step > 1
                  ? "A CONNECTION WORTH MAKING"
                  : "DISCOVERING POTENTIAL"}
              </span>
              <ArrowUpRight size={16} />
            </div>
            <div className="pres-match-person">
              <div className="pres-match-avatar">JL</div>
              <div>
                <h3>Jordan Lee</h3>
                <p>Engineer & agent builder</p>
              </div>
              <div className="pres-match-score">
                {step > 1 ? "91" : "—"}
                <small>/ 100</small>
              </div>
            </div>
            <div className="pres-match-reasons">
              <p>
                <Check size={14} /> Shared focus on AI agents
              </p>
              <p>
                <Check size={14} /> Product + engineering expertise
              </p>
            </div>
            <div className="pres-proposal">
              <span className="pres-status-dot" />
              {step > 1
                ? "Introduction proposed · approval pending"
                : "Your twin is exploring the fit"}
            </div>
          </div>
          <p className="pres-network-footnote">
            Explainable heuristics, not predictions of success.
            <br />
            Only approved profile information is shared.
          </p>
        </div>
      </div>
    </div>
  );
}
