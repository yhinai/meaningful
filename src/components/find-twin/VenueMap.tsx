"use client";

import { useId, useRef, useState, type PointerEvent } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  Armchair,
  Coffee,
  DoorOpen,
  MapPin,
  Mic2,
  Minus,
  Plus,
  RotateCcw,
  Store,
  UserRound,
  ChevronDown,
  ClipboardList,
} from "lucide-react";
import type { VenueConfig } from "@/features/find-twin/venue/venue-types";
import "./VenueMap.css";

export type VenueMapProps = {
  venue: VenueConfig;
  destinationZoneId?: string | null;
  selfZoneId?: string | null;
  counterpartZoneId?: string | null;
  counterpartName?: string;
  selfCheckInAt?: string;
  counterpartCheckInAt?: string;
  routeZoneIds?: string[];
  onZoneSelect?: (zoneId: string) => void;
};

const zoneIcons = {
  entrance: DoorOpen,
  registration: ClipboardList,
  coffee_bar: Coffee,
  main_stage: Mic2,
  sponsor_booths: Store,
  quiet_corner: Armchair,
};
const clampZoom = (value: number) => Math.min(2.4, Math.max(0.85, value));

/** An illustrative venue plan. Pins are venue landmarks or voluntary zone reports. */
export default function VenueMap({
  venue,
  destinationZoneId,
  selfZoneId,
  counterpartZoneId,
  counterpartName = "Your connection",
  selfCheckInAt,
  counterpartCheckInAt,
  routeZoneIds = [],
  onZoneSelect,
}: VenueMapProps) {
  const floor = venue.floors[0];
  const [camera, setCamera] = useState({ x: 0, y: 0, zoom: 1 });
  const [dragging, setDragging] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [expandedPin, setExpandedPin] = useState<string | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef({
    x: 0,
    y: 0,
    cameraX: 0,
    cameraY: 0,
    zoom: 1,
    distance: 0,
  });
  const reduceMotion = useReducedMotion();
  const routeId = useId();
  const landmarks = venue.zones.filter(
    (zone) => zone.isMeetingSpot && zone.floorId === floor?.id,
  );
  const routePoints = routeZoneIds
    .map((id) => venue.zones.find((zone) => zone.id === id))
    .filter((zone) => zone && zone.floorId === floor?.id);
  const polyline = routePoints.map((zone) => `${zone!.x},${zone!.y}`).join(" ");

  function startGesture(event: PointerEvent<HTMLDivElement>) {
    if ((event.target as Element).closest("button,a,summary")) return;
    pointers.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
    event.currentTarget.setPointerCapture(event.pointerId);
    const positions = [...pointers.current.values()];
    const distance =
      positions.length === 2
        ? Math.hypot(
            positions[0].x - positions[1].x,
            positions[0].y - positions[1].y,
          )
        : 0;
    gesture.current = {
      x: event.clientX,
      y: event.clientY,
      cameraX: camera.x,
      cameraY: camera.y,
      zoom: camera.zoom,
      distance,
    };
    setDragging(true);
  }

  function moveGesture(event: PointerEvent<HTMLDivElement>) {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
    const positions = [...pointers.current.values()];
    if (positions.length === 2 && gesture.current.distance > 0) {
      const distance = Math.hypot(
        positions[0].x - positions[1].x,
        positions[0].y - positions[1].y,
      );
      setCamera((previous) => ({
        ...previous,
        zoom: clampZoom(
          (gesture.current.zoom * distance) / gesture.current.distance,
        ),
      }));
    } else {
      const maxX =
        event.currentTarget.clientWidth * (0.35 + (camera.zoom - 1) / 2);
      const maxY =
        event.currentTarget.clientHeight * (0.25 + (camera.zoom - 1) / 2);
      setCamera((previous) => ({
        ...previous,
        x: Math.max(
          -maxX,
          Math.min(
            maxX,
            gesture.current.cameraX + event.clientX - gesture.current.x,
          ),
        ),
        y: Math.max(
          -maxY,
          Math.min(
            maxY,
            gesture.current.cameraY + event.clientY - gesture.current.y,
          ),
        ),
      }));
    }
  }

  function endGesture(event: PointerEvent<HTMLDivElement>) {
    pointers.current.delete(event.pointerId);
    const remaining = [...pointers.current.values()][0];
    if (remaining)
      gesture.current = {
        ...gesture.current,
        x: remaining.x,
        y: remaining.y,
        cameraX: camera.x,
        cameraY: camera.y,
        zoom: camera.zoom,
        distance: 0,
      };
    else setDragging(false);
  }

  if (!floor)
    return (
      <div className="ft-map-unavailable">
        The venue floor plan is unavailable. Use the named meeting spot to find
        your connection.
      </div>
    );

  return (
    <section className="ft-venue-map" aria-label="Demo Venue Map">
      <div className="ft-map-topline">
        <span>
          <span className="ft-map-building" /> {venue.name}
          <small>Demo Venue Map</small>
        </span>
        <span className="ft-map-floor">{floor.label}</span>
      </div>
      <div
        className={`ft-map-viewport ${dragging ? "is-panning" : ""}`}
        onPointerDown={startGesture}
        onPointerMove={moveGesture}
        onPointerUp={endGesture}
        onPointerCancel={endGesture}
        aria-label="Venue floor plan. Drag to pan or pinch to zoom."
      >
        <div className="ft-map-center">
          <motion.div
            className="ft-map-scene"
            animate={{ x: camera.x, y: camera.y, scale: camera.zoom }}
            transition={
              reduceMotion || dragging
                ? { duration: 0 }
                : { type: "spring", stiffness: 280, damping: 30 }
            }
            style={{ aspectRatio: `${floor.width}/${floor.height}` }}
          >
            <img
              className="ft-map-base"
              src={floor.imagePath}
              alt="Fictional ground-floor layout with marked rooms and connecting hallways"
              draggable={false}
            />
            {routePoints.length > 1 && (
              <svg
                className="ft-map-route"
                viewBox={`0 0 ${floor.width} ${floor.height}`}
                aria-label="Route through configured venue corridors"
              >
                <title>Route through configured venue corridors</title>
                <polyline
                  points={polyline}
                  fill="none"
                  stroke="#fff"
                  strokeWidth="15"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <motion.polyline
                  key={`${routeId}-${polyline}`}
                  points={polyline}
                  fill="none"
                  stroke="#a5946f"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: reduceMotion ? 1 : 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
                />
                <polyline
                  points={polyline}
                  fill="none"
                  stroke="#fff"
                  strokeOpacity=".45"
                  strokeWidth="1.5"
                  strokeDasharray="1 13"
                  strokeLinecap="round"
                />
              </svg>
            )}
            {landmarks.map((zone) => {
              const selected = zone.id === destinationZoneId;
              const Icon =
                zoneIcons[zone.id as keyof typeof zoneIcons] || MapPin;
              return (
                <div
                  key={zone.id}
                  className={`ft-landmark ${selected ? "is-destination" : ""}`}
                  style={{
                    left: `${(zone.x / floor.width) * 100}%`,
                    top: `${(zone.y / floor.height) * 100}%`,
                  }}
                >
                  <button
                    onClick={() => onZoneSelect?.(zone.id)}
                    aria-label={`${zone.label}${selected ? ", selected meeting spot" : ""}`}
                    title={zone.description}
                  >
                    <span className="ft-landmark-disc">
                      {selected ? (
                        <MapPin size={17} strokeWidth={1.7} />
                      ) : (
                        <Icon size={16} strokeWidth={1.5} />
                      )}
                    </span>
                    <span className="ft-landmark-label">{zone.label}</span>
                    {selected && <small>Meeting spot</small>}
                  </button>
                </div>
              );
            })}
            {[
              {
                id: selfZoneId,
                label: "You",
                own: true,
                checkedInAt: selfCheckInAt,
              },
              {
                id: counterpartZoneId,
                label: counterpartName.split(" ")[0],
                own: false,
                checkedInAt: counterpartCheckInAt,
              },
            ].map((marker) => {
              const zone = venue.zones.find(
                (item) => item.id === marker.id && item.floorId === floor.id,
              );
              if (!zone) return null;
              const markerId = marker.own ? "self" : "counterpart";
              const detailsOpen = expandedPin === markerId;
              const checkInDate = marker.checkedInAt
                ? new Date(marker.checkedInAt)
                : null;
              const checkInTime =
                checkInDate && Number.isFinite(checkInDate.getTime())
                  ? new Intl.DateTimeFormat(undefined, {
                      hour: "numeric",
                      minute: "2-digit",
                    }).format(checkInDate)
                  : null;
              return (
                <motion.div
                  key={marker.own ? "self" : "counterpart"}
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`ft-person-pin ${marker.own ? "self" : "counterpart"} ${detailsOpen ? "is-expanded" : ""}`}
                  style={{
                    left: `calc(${(zone.x / floor.width) * 100}% + ${marker.own ? -38 : 38}px)`,
                    top: `calc(${(zone.y / floor.height) * 100}% - 29px)`,
                  }}
                  title={`${marker.label} checked in near ${zone.label}. Self-reported, not live location.`}
                >
                  <button
                    type="button"
                    aria-label={`${marker.label}, self-reported near ${zone.label}. Show check-in details.`}
                    aria-expanded={detailsOpen}
                    aria-controls={`${routeId}-${markerId}-details`}
                    onClick={() =>
                      setExpandedPin(detailsOpen ? null : markerId)
                    }
                  >
                    <span>
                      <UserRound size={13} strokeWidth={2} />
                    </span>
                    <strong>{marker.label}</strong>
                    <small>Self-reported</small>
                  </button>
                  {detailsOpen && (
                    <div
                      className="ft-pin-details"
                      id={`${routeId}-${markerId}-details`}
                      role="status"
                    >
                      <b>Self-reported near {zone.label}</b>
                      {checkInTime && <span>Checked in at {checkInTime}</span>}
                      <span>No live location is being tracked.</span>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </div>
      <div className="ft-map-bottomline">
        <span>
          <i className="ft-map-key-destination" /> Meeting spot
          {(selfZoneId || counterpartZoneId) && (
            <>
              <i className="ft-map-key-zone" /> Shared zone
            </>
          )}
        </span>
        <div className="ft-map-controls">
          <button
            onClick={() =>
              setCamera((previous) => ({
                ...previous,
                zoom: clampZoom(previous.zoom - 0.2),
              }))
            }
            aria-label="Zoom out"
            disabled={camera.zoom <= 0.85}
          >
            <Minus size={16} />
          </button>
          <button
            onClick={() =>
              setCamera((previous) => ({
                ...previous,
                zoom: clampZoom(previous.zoom + 0.2),
              }))
            }
            aria-label="Zoom in"
            disabled={camera.zoom >= 2.4}
          >
            <Plus size={16} />
          </button>
          <button
            onClick={() => setCamera({ x: 0, y: 0, zoom: 1 })}
            aria-label="Reset map"
            title="Reset map"
          >
            <RotateCcw size={15} />
          </button>
        </div>
      </div>
      <details
        className="ft-map-zone-list"
        open={listOpen}
        onToggle={(event) => setListOpen(event.currentTarget.open)}
      >
        <summary>
          Venue landmarks <ChevronDown size={14} />
        </summary>
        <ul>
          {landmarks.map((zone) => (
            <li key={zone.id}>
              <button onClick={() => onZoneSelect?.(zone.id)}>
                <strong>{zone.label}</strong>
                <span>{zone.description}</span>
                {destinationZoneId === zone.id && <small>Meeting spot</small>}
              </button>
            </li>
          ))}
        </ul>
      </details>
      <p className="ft-map-accuracy">
        Landmark guidance. No GPS, measured distance, or live tracking.
      </p>
    </section>
  );
}
