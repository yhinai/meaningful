"use client";
import { useEffect, useId, useRef, useState, type PointerEvent } from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "motion/react";
import { TWIN_STYLES, type TwinStyleId } from "@/lib/twin-styles";
import { useTwinStyle } from "./use-twin-style";
import "./twin-character.css";

export type TwinCharacterProps = {
  size?: number;
  mood?: "idle" | "working" | "happy";
  interactive?: boolean;
  className?: string;
  style?: TwinStyleId;
  personId?: string;
};

/** Code-native creatures keep their facial animation crisp at every size. */
export function TwinCharacter({
  size = 160,
  mood = "idle",
  interactive = false,
  className = "",
  style,
  personId = "usr_self",
}: TwinCharacterProps) {
  const uid = useId().replaceAll(":", "");
  const [savedStyle] = useTwinStyle(personId);
  const kind = style ?? savedStyle;
  const palette =
    TWIN_STYLES.find((item) => item.id === kind) ?? TWIN_STYLES[0];
  const reduce = useReducedMotion();
  const [hello, setHello] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const tiltX = useSpring(x, { stiffness: 170, damping: 24 });
  const tiltY = useSpring(y, { stiffness: 170, damping: 24 });
  const paint = (name: string) => `url(#${uid}-${name})`;
  function greet() {
    if (!interactive) return;
    setHello(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setHello(false), 1000);
  }
  function move(event: PointerEvent<HTMLSpanElement>) {
    if (!interactive || reduce) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    y.set(
      ((event.clientX - bounds.left - bounds.width / 2) / bounds.width) * 9,
    );
    x.set(
      ((event.clientY - bounds.top - bounds.height / 2) / bounds.height) * -7,
    );
  }
  const whiskers = kind === "cat" || kind === "fox";
  return (
    <motion.span
      className={`twin-character creature-${kind} twin-character-${mood} ${hello ? "is-greeting" : ""} ${size < 48 ? "is-mini" : ""} ${className}`}
      style={{
        width: size,
        height: size,
        rotateX: reduce ? 0 : tiltX,
        rotateY: reduce ? 0 : tiltY,
      }}
      role={interactive ? "button" : "img"}
      aria-label={
        interactive
          ? `Say hello to your ${palette.label} twin`
          : `${palette.label} AI twin`
      }
      tabIndex={interactive ? 0 : undefined}
      onPointerMove={move}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
      onClick={greet}
      onKeyDown={(event) => {
        if (interactive && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          greet();
        }
      }}
      animate={reduce ? {} : { rotate: hello ? [0, -5, 6, -3, 0] : 0 }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
    >
      <svg
        viewBox="0 0 280 280"
        fill="none"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <radialGradient id={`${uid}-body`} cx=".3" cy=".2" r=".8">
            <stop stopColor={palette.light} />
            <stop offset=".43" stopColor={palette.body} />
            <stop offset="1" stopColor={palette.dark} />
          </radialGradient>
          <radialGradient id={`${uid}-belly`} cx=".45" cy=".25" r=".8">
            <stop stopColor="white" stopOpacity=".85" />
            <stop offset="1" stopColor={palette.light} stopOpacity=".65" />
          </radialGradient>
          <radialGradient id={`${uid}-shine`}>
            <stop stopColor="white" stopOpacity=".85" />
            <stop offset="1" stopColor="white" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`${uid}-cheek`}>
            <stop stopColor="#f2b5a3" stopOpacity=".8" />
            <stop offset="1" stopColor="#f2b5a3" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`${uid}-shadow`}>
            <stop stopColor="#767080" stopOpacity=".18" />
            <stop offset="1" stopColor="#767080" stopOpacity="0" />
          </radialGradient>
          <linearGradient
            id={`${uid}-ear`}
            x1="80"
            y1="20"
            x2="160"
            y2="125"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor={palette.light} />
            <stop offset="1" stopColor={palette.body} />
          </linearGradient>
        </defs>
        <ellipse
          className="creature-shadow"
          cx="140"
          cy="254"
          rx="83"
          ry="16"
          fill={paint("shadow")}
        />
        <g className="creature-body">
          {kind === "cloud" && (
            <g>
              <path
                d="M101 105C71 90 66 51 85 36C109 48 119 76 109 108Z"
                fill={paint("ear")}
              />
              <path
                d="M165 107C156 75 175 39 203 31C217 54 200 88 174 108Z"
                fill={paint("ear")}
              />
              <path
                d="M88 49C97 68 102 83 105 99M194 44C183 62 175 78 171 99"
                stroke={palette.dark}
                strokeOpacity=".5"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </g>
          )}
          {kind === "bunny" && (
            <g>
              <ellipse
                cx="103"
                cy="67"
                rx="16"
                ry="53"
                transform="rotate(-15 103 67)"
                fill={paint("ear")}
              />
              <ellipse
                cx="176"
                cy="66"
                rx="16"
                ry="54"
                transform="rotate(15 176 66)"
                fill={paint("ear")}
              />
              <ellipse
                cx="103"
                cy="64"
                rx="7"
                ry="37"
                transform="rotate(-15 103 64)"
                fill="#fff1e9"
                opacity=".55"
              />
              <ellipse
                cx="176"
                cy="63"
                rx="7"
                ry="38"
                transform="rotate(15 176 63)"
                fill="#fff1e9"
                opacity=".55"
              />
            </g>
          )}
          {kind === "cat" && (
            <g>
              <path d="M71 122L69 63L115 100Z" fill={paint("ear")} />
              <path d="M166 99L211 63L211 124Z" fill={paint("ear")} />
              <path
                d="M80 100L79 78L99 99Z M183 100L201 79L201 104Z"
                fill="#f8e8df"
                opacity=".8"
              />
            </g>
          )}
          {kind === "fox" && (
            <g>
              <path d="M70 125L57 42L117 102Z" fill={paint("ear")} />
              <path d="M164 102L224 42L211 126Z" fill={paint("ear")} />
              <path
                d="M79 104L71 61L104 103Z M177 103L211 61L203 108Z"
                fill="#fff1da"
                opacity=".85"
              />
              <path
                d="M212 220C250 218 267 193 251 173C243 200 220 198 204 204Z"
                fill={paint("body")}
              />
              <path
                d="M250 174C258 186 256 195 247 203L240 196Z"
                fill="#e0f2e8"
              />
            </g>
          )}
          {kind === "bear" && (
            <g>
              <circle cx="83" cy="95" r="27" fill={paint("ear")} />
              <circle cx="199" cy="95" r="27" fill={paint("ear")} />
              <circle cx="83" cy="95" r="15" fill="#fff0da" opacity=".7" />
              <circle cx="199" cy="95" r="15" fill="#fff0da" opacity=".7" />
            </g>
          )}
          {kind === "owl" && (
            <g>
              <path d="M76 121L63 63L113 95Z" fill={paint("ear")} />
              <path d="M167 94L217 63L204 121Z" fill={paint("ear")} />
              <path
                d="M79 100L76 79L95 97 M185 97L205 79L202 103"
                stroke={palette.light}
                strokeWidth="7"
                strokeLinecap="round"
              />
            </g>
          )}
          <ellipse cx="99" cy="235" rx="33" ry="16" fill={palette.body} />
          <ellipse cx="180" cy="235" rx="33" ry="16" fill={palette.body} />
          <path
            className="creature-arm left"
            d="M70 161C50 151 35 154 36 168C38 184 58 192 75 187Z"
            fill={paint("body")}
          />
          <path
            className="creature-arm right"
            d="M209 161C229 151 245 154 243 169C241 185 221 193 204 187Z"
            fill={paint("body")}
          />
          <path
            d="M65 142C64 104 93 83 139 83C186 83 215 105 215 144L217 186C218 224 195 244 140 244C86 244 62 225 63 187Z"
            fill={paint("body")}
          />
          <ellipse
            cx="140"
            cy="197"
            rx={kind === "fox" ? 51 : 49}
            ry={kind === "fox" ? 36 : 38}
            fill={paint("belly")}
          />
          {kind === "owl" && (
            <g fill={palette.light} opacity=".65">
              <ellipse cx="112" cy="153" rx="25" ry="28" />
              <ellipse cx="167" cy="153" rx="25" ry="28" />
            </g>
          )}
          <ellipse
            cx="107"
            cy="115"
            rx="25"
            ry="23"
            fill={paint("shine")}
            opacity=".5"
          />
          <path
            d="M133 116Q140 110 147 116"
            stroke="white"
            strokeOpacity=".5"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <ellipse cx="96" cy="167" rx="18" ry="11" fill={paint("cheek")} />
          <ellipse cx="184" cy="167" rx="18" ry="11" fill={paint("cheek")} />
          <g className="creature-eyes">
            <ellipse cx="111" cy="151" rx="5.5" ry="8" fill="#393541" />
            <ellipse cx="169" cy="151" rx="5.5" ry="8" fill="#393541" />
            <circle cx="112" cy="148" r="1.8" fill="white" opacity=".9" />
            <circle cx="170" cy="148" r="1.8" fill="white" opacity=".9" />
          </g>
          {kind === "fox" && (
            <path
              d="M134 163Q140 158 146 163L140 168Z"
              fill="#566d66"
              opacity=".8"
            />
          )}
          <path
            d={
              kind === "owl"
                ? "M135 169L140 177L145 169Z"
                : "M131 168Q140 179 149 168"
            }
            stroke="#5a4b64"
            strokeWidth="3"
            fill={kind === "owl" ? "#e6bd80" : "none"}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {whiskers && (
            <g
              stroke="#80808b"
              strokeWidth="1.8"
              strokeLinecap="round"
              opacity=".6"
            >
              <path d="M76 166L94 169M77 176L94 174M186 169L204 166M186 174L204 176" />
            </g>
          )}
          <g fill="white" opacity=".65">
            <circle cx="128" cy="194" r="2.4" />
            <circle cx="140" cy="195" r="2.4" />
            <circle cx="152" cy="194" r="2.4" />
          </g>
        </g>
      </svg>
      {mood === "working" && (
        <span className="twin-character-activity" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
      )}
    </motion.span>
  );
}
export default TwinCharacter;
