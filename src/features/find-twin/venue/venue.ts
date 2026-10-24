import fixture from "./demo-venue.json";
import type { VenueConfig } from "./venue-types";
export const demoVenue = fixture as VenueConfig;
export const meetingZones = demoVenue.zones.filter(
  (zone) => zone.isMeetingSpot,
);
export type { VenueConfig, VenueZone } from "./venue-types";
