"use client";

import { useState } from "react";
import { ArrowRight, MapPin, ShieldCheck } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import type { ZoneCheckIn as CheckIn } from "@/features/find-twin/types";
import type { VenueConfig } from "@/features/find-twin/venue/venue-types";

type Props = {
  venue: VenueConfig;
  checkIn: CheckIn | null;
  now: number;
  busy: boolean;
  disabled?: boolean;
  onShare: (zoneId: string) => Promise<boolean>;
  onRevoke: () => Promise<boolean>;
};

export default function ZoneCheckIn({
  venue,
  checkIn,
  now,
  busy,
  disabled,
  onShare,
  onRevoke,
}: Props) {
  const [open, setOpen] = useState(false);
  const [zoneId, setZoneId] = useState("entrance");
  const zone = venue.zones.find((item) => item.id === checkIn?.zoneId);
  const minutes = checkIn
    ? Math.max(0, Math.ceil((Date.parse(checkIn.expiresAt) - now) / 60000))
    : 0;
  return (
    <section className="ft-check-in ft-simple-checkin">
      {checkIn ? (
        <div className="ft-checkin-active">
          <span>
            <i />
            You’re near {zone?.label}
            <small>Self-reported · {minutes} min left</small>
          </span>
          <button disabled={busy} onClick={() => void onRevoke()}>
            Stop sharing
          </button>
        </div>
      ) : (
        <button
          className="ft-share-zone-link"
          onClick={() => setOpen(true)}
          disabled={busy || disabled}
        >
          <MapPin size={14} strokeWidth={1.5} />
          Share a zone<small>Optional</small>
        </button>
      )}
      <Dialog
        open={open}
        onClose={() => {
          if (!busy) setOpen(false);
        }}
        title="Share your zone?"
        description="Only this connection can see it, for up to 15 minutes. No live tracking."
      >
        <div className="ft-mini-content">
          <label className="ft-mini-label" htmlFor="ft-checkin-zone">
            I’m near…
          </label>
          <select
            className="ft-mini-select"
            id="ft-checkin-zone"
            value={zoneId}
            disabled={busy || disabled}
            onChange={(event) => setZoneId(event.target.value)}
          >
            {venue.zones
              .filter((item) => item.isMeetingSpot)
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
          </select>
          <p className="ft-mini-privacy">
            <ShieldCheck size={14} />
            This is a voluntary check-in. Stop sharing anytime, or let it expire
            automatically.
          </p>
          <button
            className="ft-primary-action"
            disabled={busy || disabled}
            onClick={async () => {
              if (await onShare(zoneId)) setOpen(false);
            }}
          >
            {busy ? "Sharing…" : "Share for 15 minutes"}
            <ArrowRight size={15} />
          </button>
        </div>
      </Dialog>
    </section>
  );
}
