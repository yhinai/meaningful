"use client";
import Link from "next/link";
import { ArrowUpRight, ShieldCheck } from "lucide-react";
import type { DemoState } from "@/lib/types";
import { TwinCharacter } from "@/components/twin-character/TwinCharacter";
import TwinStylePicker from "@/components/twin-character/TwinStylePicker";
import { useTwinStyle } from "@/components/twin-character/use-twin-style";
export default function TwinPreview({ state }: { state: DemoState }) {
  const profile = state.profile;
  const [style, setStyle] = useTwinStyle(state.activeUserId);
  const running = state.runs.at(-1)?.status === "running";
  return (
    <div className="conference-twin-preview">
      <TwinCharacter
        size={150}
        personId={state.activeUserId}
        style={style}
        mood={running ? "working" : "happy"}
        interactive
      />
      <h3>A little more {profile.name.split(" ")[0]}.</h3>
      <p>
        Your twin brings your curiosity to the conference. You choose what
        happens next.
      </p>
      <TwinStylePicker value={style} onChange={setStyle} />
      <div className="conference-twin-intention">
        <span>HERE FOR</span>
        <p>{state.goals.text}</p>
      </div>
      <p className="conference-twin-scope">
        <ShieldCheck size={13} />
        Your approved profile. Your boundaries.
      </p>
      <Link className="btn btn-primary" href="/twin/train">
        Make your twin more you <ArrowUpRight size={14} />
      </Link>
    </div>
  );
}
