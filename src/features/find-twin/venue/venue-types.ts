export type VenueZone = {
  id: string;
  floorId: string;
  label: string;
  x: number;
  y: number;
  description: string;
  isMeetingSpot: boolean;
  kind?: "landmark" | "corridor";
};

export type VenueConfig = {
  eventId: string;
  venueId: string;
  name: string;
  demo?: boolean;
  endsAt?: string;
  floors: Array<{
    id: string;
    label: string;
    imagePath: string;
    width: number;
    height: number;
  }>;
  zones: VenueZone[];
  paths: Array<{
    fromZoneId: string;
    toZoneId: string;
    lengthUnits?: number;
  }>;
};
