import type { VenueConfig } from "../venue/venue-types";

export type VenueRoute = {
  status: "available" | "unknown_start" | "unavailable";
  zoneIds: string[];
  points: Array<{ x: number; y: number }>;
  directions: string[];
};

/** Walks configured same-floor corridor links. Relative weights are never distances. */
export function shortestPath(
  venue: VenueConfig,
  startZoneId?: string | null,
  destinationZoneId?: string | null,
): VenueRoute {
  const destination = venue.zones.find((zone) => zone.id === destinationZoneId);
  const start = venue.zones.find((zone) => zone.id === startZoneId);
  if (!destination)
    return {
      status: "unavailable",
      zoneIds: [],
      points: [],
      directions: ["Choose a meeting spot to see landmark directions."],
    };
  if (!start)
    return {
      status: "unknown_start",
      zoneIds: [],
      points: [],
      directions: [
        `Meet at ${destination.label}.`,
        destination.description,
        "Optionally share your current zone to see a corridor route.",
      ],
    };
  if (start.floorId !== destination.floorId)
    return {
      status: "unavailable",
      zoneIds: [],
      points: [],
      directions: [
        "Route unavailable between these floors.",
        destination.description,
      ],
    };

  const neighbors = new Map<string, Array<{ id: string; weight: number }>>();
  for (const edge of venue.paths) {
    const from = venue.zones.find((zone) => zone.id === edge.fromZoneId);
    const to = venue.zones.find((zone) => zone.id === edge.toZoneId);
    if (
      !from ||
      !to ||
      from.floorId !== start.floorId ||
      to.floorId !== start.floorId
    )
      continue;
    const weight =
      edge.lengthUnits !== undefined && edge.lengthUnits > 0
        ? edge.lengthUnits
        : 1;
    neighbors.set(from.id, [
      ...(neighbors.get(from.id) || []),
      { id: to.id, weight },
    ]);
    neighbors.set(to.id, [
      ...(neighbors.get(to.id) || []),
      { id: from.id, weight },
    ]);
  }
  const distances = new Map<string, number>([[start.id, 0]]);
  const previous = new Map<string, string>();
  const visited = new Set<string>();
  while (true) {
    const next = [...distances.entries()]
      .filter(([id]) => !visited.has(id))
      .sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]))[0];
    if (!next) break;
    const [id, distance] = next;
    if (id === destination.id) break;
    visited.add(id);
    for (const neighbor of neighbors.get(id) || []) {
      const candidate = distance + neighbor.weight;
      if (candidate < (distances.get(neighbor.id) ?? Infinity)) {
        distances.set(neighbor.id, candidate);
        previous.set(neighbor.id, id);
      }
    }
  }
  if (!distances.has(destination.id))
    return {
      status: "unavailable",
      zoneIds: [],
      points: [],
      directions: [
        "Route unavailable along configured walkways.",
        destination.description,
      ],
    };
  const zoneIds = [destination.id];
  while (zoneIds[0] !== start.id) zoneIds.unshift(previous.get(zoneIds[0])!);
  const zones = zoneIds.map((id) =>
    venue.zones.find((zone) => zone.id === id)!,
  );
  const directions =
    start.id === destination.id
      ? [
          `You checked in at ${destination.label}.`,
          "Confirm your arrival when you are ready.",
        ]
      : [
          `From ${start.label}, follow the marked corridor.`,
          ...zones
            .slice(1, -1)
            .filter((zone) => zone.kind === "corridor")
            .map((zone) => zone.description),
          `Meet at ${destination.label}. ${destination.description}`,
        ];
  return {
    status: "available",
    zoneIds,
    points: zones.map(({ x, y }) => ({ x, y })),
    directions,
  };
}
