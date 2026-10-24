"use client";
import { useState } from "react";
import type { Person } from "@/lib/types";
import { portraitFor } from "@/lib/portraits";
import TwinCharacter from "@/components/twin-character/TwinCharacter";
import "./avatar.css";

export function PersonAvatar({
  person,
  size = 48,
  showTwin = true,
}: {
  person: Person;
  size?: number;
  showTwin?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const avatarUrl = person.id === "usr_self" ? null : portraitFor(person.id);
  const twinSize = Math.max(22, Math.min(30, Math.round(size * 0.48)));
  return (
    <span className="person-avatar-group" style={{ width: size, height: size }}>
      <span
        className="person-avatar"
        style={{ width: size, height: size, background: person.color }}
      >
        {!failed && avatarUrl ? (
          <img
            alt={person.name}
            src={avatarUrl}
            onError={() => setFailed(true)}
          />
        ) : (
          person.avatar
        )}
      </span>
      {showTwin && (
        <span
          className="person-avatar-twin"
          style={{ width: twinSize, height: twinSize }}
          title={`${person.name.split(" ")[0]}’s AI twin`}
        >
          <TwinCharacter size={twinSize} personId={person.id} />
        </span>
      )}
    </span>
  );
}
