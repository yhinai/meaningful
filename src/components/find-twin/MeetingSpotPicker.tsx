"use client";

import {
  Coffee,
  DoorOpen,
  MapPin,
  Mic2,
  PanelsTopLeft,
  Sparkles,
  Check,
} from "lucide-react";
import type { VenueConfig } from "@/features/find-twin/venue/venue-types";
const icons: Record<string, typeof MapPin> = {
  coffee_bar: Coffee,
  entrance: DoorOpen,
  main_stage: Mic2,
  sponsor_booths: PanelsTopLeft,
  quiet_corner: Sparkles,
};

export default function MeetingSpotPicker({
  venue,
  value,
  onChange,
}: {
  venue: VenueConfig;
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <fieldset className="ft-spot-picker">
      <legend>A good place for a first hello.</legend>
      {venue.zones
        .filter((z) => z.isMeetingSpot)
        .map((zone) => {
          const Icon = icons[zone.id] || MapPin;
          return (
            <label
              className={`ft-spot-option ${value === zone.id ? "selected" : ""}`}
              key={zone.id}
            >
              <input
                type="radio"
                name="meeting-spot"
                checked={value === zone.id}
                value={zone.id}
                onChange={() => onChange(zone.id)}
              />
              <span className="ft-spot-icon">
                <Icon size={18} strokeWidth={1.4} />
              </span>
              <span>
                <strong>{zone.label}</strong>
                <small>{zone.description}</small>
              </span>
              <span className="ft-option-check">
                {value === zone.id && <Check size={12} />}
              </span>
            </label>
          );
        })}
    </fieldset>
  );
}
