import { ArrowUpRight, MapPin } from "lucide-react";
import type { VenueConfig } from "@/features/find-twin/venue/venue-types";

type Props = {
  venue: VenueConfig;
  zoneId: string;
  route: { status: string; directions: string[]; zoneIds: string[] };
  hasStart: boolean;
};
export default function DirectionsPanel({
  venue,
  zoneId,
  route,
  hasStart,
}: Props) {
  const zone = venue.zones.find((z) => z.id === zoneId);
  return (
    <section className="ft-directions">
      <div className="ft-directions-title">
        <ArrowUpRight size={17} strokeWidth={1.5} />
        <h3>Make your way to {zone?.label}.</h3>
      </div>
      {hasStart && route.status === "available" ? (
        <ol>
          {route.directions.map((direction, i) => (
            <li key={`${direction}-${i}`}>
              <span>{i + 1}</span>
              {direction}
            </li>
          ))}
        </ol>
      ) : (
        <>
          <p>{zone?.description}</p>
          {hasStart ? (
            <small>
              Route unavailable. Follow venue signage to {zone?.label}; the
              destination is marked on your map.
            </small>
          ) : (
            <small>
              The meeting spot is marked. Share an optional starting zone below
              to see a corridor route.
            </small>
          )}
        </>
      )}
      <div className="ft-directions-foot">
        <MapPin size={12} />
        <span>Landmark guidance · demo floor plan</span>
      </div>
    </section>
  );
}
