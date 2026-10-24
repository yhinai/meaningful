import { Check, MapPin, ShieldCheck } from "lucide-react";
import type { RendezvousView, ZoneCheckIn } from "@/features/find-twin/types";
import type { VenueConfig } from "@/features/find-twin/venue/venue-types";

export default function CounterpartStatus({
  view,
  venue,
  checkIn,
  now,
  online,
}: {
  view: RendezvousView;
  venue: VenueConfig;
  checkIn: ZoneCheckIn | null;
  now: number;
  online: boolean;
}) {
  const firstName = view.counterpart.displayName.split(" ")[0];
  const zone = venue.zones.find((z) => z.id === checkIn?.zoneId);
  const minutes = checkIn
    ? Math.max(0, Math.floor((now - Date.parse(checkIn.createdAt)) / 60000))
    : 0;
  return (
    <div
      className={`ft-counterpart-status ${view.counterpart.arrived && online ? "arrived" : ""}`}
    >
      {view.counterpart.arrived && online ? (
        <>
          <Check size={15} />
          <span>
            {firstName} marked arrival.<small>Ready for a real hello.</small>
          </span>
        </>
      ) : checkIn ? (
        <>
          <MapPin size={15} strokeWidth={1.5} />
          <span>
            {firstName} checked in near {zone?.label}.
            <small>
              Self-reported · {minutes < 1 ? "just now" : `${minutes} min ago`}
            </small>
          </span>
        </>
      ) : (
        <>
          <ShieldCheck size={15} strokeWidth={1.5} />
          <span>
            {online
              ? `${firstName} hasn’t shared a check-in.`
              : "Check-ins hidden while offline."}
            <small>
              {online
                ? "You can meet without sharing a zone."
                : "Your last confirmed spot is saved."}
            </small>
          </span>
        </>
      )}
    </div>
  );
}
