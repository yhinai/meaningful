"use client";
import { useId } from "react";
import { TWIN_STYLES, type TwinStyleId } from "@/lib/twin-styles";
import TwinCharacter from "./TwinCharacter";
import "./twin-style-picker.css";
export default function TwinStylePicker({
  value,
  onChange,
}: {
  value: TwinStyleId;
  onChange: (style: TwinStyleId) => void;
}) {
  const groupId = useId();
  return (
    <fieldset className="twin-style-picker">
      <legend>Choose your twin</legend>
      <div>
        {TWIN_STYLES.map((style) => (
          <label
            key={style.id}
            className={value === style.id ? "selected" : ""}
          >
            <input
              type="radio"
              name={`twin-character-style-${groupId}`}
              checked={value === style.id}
              value={style.id}
              onChange={() => onChange(style.id)}
            />
            <TwinCharacter size={66} style={style.id} />
            <span>
              <strong>{style.label}</strong>
              <small>{style.color}</small>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
export { TwinStylePicker };
