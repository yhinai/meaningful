"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  Clock3,
  LoaderCircle,
  MapPin,
  RefreshCw,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useRendezvous } from "@/features/find-twin/hooks/use-rendezvous";
import { shortestPath } from "@/features/find-twin/routing/shortest-path";
import { Dialog } from "@/components/ui/dialog";
import TwinCharacter from "@/components/twin-character/TwinCharacter";
import VenueMap from "./VenueMap";
import MeetingSpotPicker from "./MeetingSpotPicker";
import RendezvousBottomSheet from "./RendezvousBottomSheet";
import ZoneCheckIn from "./ZoneCheckIn";
import CounterpartStatus from "./CounterpartStatus";
import DirectionsPanel from "./DirectionsPanel";
import PointsCelebration from "./PointsCelebration";
import "./find-twin.css";
import "./find-twin-simple.css";

export type FindTwinScreenProps = {
  eventId: string;
  meetingId: string;
  embedded?: boolean;
  onClose?: () => void;
};

export default function FindTwinScreen({
  eventId,
  meetingId,
  embedded = false,
  onClose,
}: FindTwinScreenProps) {
  const {
    view,
    venue,
    loading,
    busy,
    error,
    errorStatus,
    online,
    now,
    refresh,
    mutate,
    switchAccount,
    selfCheckIn,
    counterpartCheckIn,
  } = useRendezvous(eventId, meetingId);
  const [picker, setPicker] = useState(false);
  const [reviewSpot, setReviewSpot] = useState(false);
  const [selectedZoneId, setSelectedZoneId] = useState("coffee_bar");
  const [expanded, setExpanded] = useState(false);
  const [participants, setParticipants] = useState<
    Array<{ id: string; name: string }>
  >([]);

  useEffect(() => {
    if (view)
      setParticipants((previous) =>
        previous.length
          ? previous
          : [
              { id: view.viewerUserId, name: view.self.displayName },
              { id: view.counterpart.id, name: view.counterpart.displayName },
            ],
      );
  }, [view]);

  const route = useMemo(
    () =>
      venue
        ? shortestPath(
            venue,
            selfCheckIn?.zoneId,
            view?.spot?.status === "confirmed" ? view.spot.zoneId : undefined,
          )
        : null,
    [venue, selfCheckIn?.zoneId, view?.spot?.zoneId, view?.spot?.status],
  );
  const name = view?.counterpart.displayName.split(" ")[0] ?? "your connection";
  const spot = venue?.zones.find((zone) => zone.id === view?.spot?.zoneId);
  const selected = venue?.zones.find((zone) => zone.id === selectedZoneId);
  const completed =
    !!view &&
    (view.verification.bothConfirmed || view.meetingStatus === "completed");
  const confirmed = view?.spot?.status === "confirmed";
  const incoming =
    view?.spot?.status === "proposed" &&
    view.spot.proposedBy !== view.viewerUserId;
  const waiting = view?.spot?.status === "proposed" && !incoming;
  const locked = busy || !online || !!view?.eventEnded;
  const verificationStarted =
    !!view?.verification.selfConfirmed ||
    !!view?.verification.counterpartConfirmed;

  function chooseSpot(id = view?.spot?.zoneId ?? "coffee_bar") {
    setSelectedZoneId(id);
    setPicker(true);
  }
  async function proposeSpot() {
    if (!view) return;
    if (
      await mutate("rendezvous/propose", "POST", {
        zoneId: selectedZoneId,
        proposalVersion: view.spot?.proposalVersion ?? 0,
      })
    ) {
      setPicker(false);
      setExpanded(false);
    }
  }
  async function acceptSpot() {
    if (!view?.spot) return;
    if (
      await mutate("rendezvous/respond", "POST", {
        proposalVersion: view.spot.proposalVersion,
        decision: "accept",
      })
    )
      setReviewSpot(false);
  }
  async function primaryAction() {
    if (!view) return;
    if (!view.spot || view.spot.status === "declined") chooseSpot();
    else if (incoming) setReviewSpot(true);
    else if (confirmed && !view.self.arrived)
      await mutate("arrival", "POST", { arrived: true });
    else if (view.self.arrived && !view.verification.selfConfirmed)
      await mutate("verification", "POST", { confirmed: true });
  }
  const primaryLabel = busy
    ? "Saving…"
    : !view?.spot || view.spot.status === "declined"
      ? "Choose a spot"
      : incoming
        ? "Review meeting spot"
        : waiting
          ? `Waiting for ${name}`
          : !view.self.arrived
            ? "I’m here"
            : view.verification.selfConfirmed
              ? `Waiting for ${name}`
              : "We met!";
  const title =
    !view?.spot || view.spot.status === "declined"
      ? "Where shall we meet?"
      : incoming
        ? `${name} suggests ${spot?.label}.`
        : waiting
          ? `${spot?.label} proposed.`
          : view.self.arrived
            ? "A hello, in person."
            : `Meet at ${spot?.label}.`;

  return (
    <div className={`ft-screen ft-simple ${embedded ? "ft-embedded" : ""}`}>
      {!embedded && (
        <div className="ft-simple-top">
          <Link href={`/event/${encodeURIComponent(eventId)}/matches`}>
            <ArrowLeft size={16} />
            Your people
          </Link>
          <span>
            <ShieldCheck size={13} />
            Private to you two
          </span>
        </div>
      )}
      {loading && !view ? (
        <div className="ft-simple-loading" aria-live="polite">
          <LoaderCircle size={22} className="ft-spin" />
          <p>Getting your meeting ready.</p>
        </div>
      ) : !view || !venue ? (
        <section className="ft-ineligible">
          <Users size={30} strokeWidth={1.2} />
          <h2>
            {[401, 403, 404].includes(errorStatus)
              ? "An introduction comes first."
              : "Let’s reconnect."}
          </h2>
          <p>
            {error ||
              "Open an approved connection to choose your meeting spot."}
          </p>
          {onClose ? (
            <button className="ft-primary-action" onClick={onClose}>
              Back to your people <ArrowRight size={15} />
            </button>
          ) : (
            <Link
              className="ft-primary-action"
              href={`/event/${encodeURIComponent(eventId)}/matches`}
            >
              Your people <ArrowRight size={15} />
            </Link>
          )}
          {![401, 403, 404].includes(errorStatus) && (
            <button className="ft-quiet-action" onClick={() => void refresh()}>
              Try again <RefreshCw size={13} />
            </button>
          )}
        </section>
      ) : (
        <>
          {error && (
            <div className="ft-error" role="alert">
              <span>{error}</span>
              <button onClick={() => void refresh()} disabled={busy}>
                Retry <RefreshCw size={13} />
              </button>
            </div>
          )}
          {view.eventEnded && !completed && (
            <p className="ft-expired-note">
              This event has ended. Your last meeting spot is saved; sharing is
              off.
            </p>
          )}
          <div className={`ft-workspace ${completed ? "is-complete" : ""}`}>
            <section className="ft-map-panel">
              <div className="ft-map-frame">
                <VenueMap
                  venue={venue}
                  destinationZoneId={
                    view.spot?.status !== "declined"
                      ? view.spot?.zoneId
                      : undefined
                  }
                  selfZoneId={completed ? undefined : selfCheckIn?.zoneId}
                  counterpartZoneId={
                    completed ? undefined : counterpartCheckIn?.zoneId
                  }
                  counterpartName={name}
                  selfCheckInAt={selfCheckIn?.createdAt}
                  counterpartCheckInAt={counterpartCheckIn?.createdAt}
                  routeZoneIds={
                    confirmed && route?.status === "available"
                      ? route.zoneIds
                      : undefined
                  }
                  onZoneSelect={
                    completed || view.eventEnded || verificationStarted
                      ? undefined
                      : chooseSpot
                  }
                />
              </div>
            </section>
            <RendezvousBottomSheet
              expanded={expanded}
              onExpandedChange={setExpanded}
            >
              {completed && view.verification.bothConfirmed ? (
                <PointsCelebration
                  eventId={eventId}
                  name={name}
                  points={view.rewards.points}
                  onClose={onClose}
                />
              ) : completed ? (
                <section className="ft-legacy-completion">
                  <Check size={30} />
                  <h2>A connection made.</h2>
                  <p>
                    This meeting is saved as completed. No new points have been
                    added.
                  </p>
                  {onClose ? (
                    <button className="ft-primary-action" onClick={onClose}>
                      Back to your people <ArrowRight size={15} />
                    </button>
                  ) : (
                    <Link
                      href={`/event/${encodeURIComponent(eventId)}/matches`}
                      className="ft-primary-action"
                    >
                      Your people <ArrowRight size={15} />
                    </Link>
                  )}
                </section>
              ) : (
                <>
                  <div className="ft-person">
                    <div className="ft-person-avatar">
                      {view.counterpart.avatarUrl && (
                        <img
                          src={view.counterpart.avatarUrl}
                          alt=""
                          onError={(event) => {
                            event.currentTarget.style.display = "none";
                          }}
                        />
                      )}
                      <span>
                        {view.counterpart.displayName
                          .split(" ")
                          .map((word) => word[0])
                          .slice(0, 2)
                          .join("")}
                      </span>
                      <span className="ft-person-mini-twin">
                        <TwinCharacter size={28} personId={view.counterpart.id} />
                      </span>
                    </div>
                    <div>
                      <h2>{view.counterpart.displayName}</h2>
                      <p>
                        <Check size={11} />
                        You both said yes
                      </p>
                    </div>
                  </div>
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={`${view.spot?.status}-${view.self.arrived}-${view.verification.selfConfirmed}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                      className="ft-sheet-main"
                    >
                      <div className="ft-state-heading">
                        <h3>{title}</h3>
                        <p>
                          {!view.spot || view.spot.status === "declined"
                            ? "Choose a landmark for your hello."
                            : incoming
                              ? "You’re already connected. Just agree on the place."
                              : waiting
                                ? `Your connection is approved. ${name} only needs to agree on this spot.`
                                : view.self.arrived
                                  ? view.verification.selfConfirmed
                                    ? `Your confirmation is saved. ${name} confirms independently.`
                                    : "Say hello, then confirm that you met."
                                  : spot?.description}
                        </p>
                      </div>
                      <button
                        className="ft-primary-action"
                        onClick={() => void primaryAction()}
                        disabled={
                          locked ||
                          !!waiting ||
                          !!view.verification.selfConfirmed
                        }
                      >
                        {busy ? (
                          <LoaderCircle size={15} className="ft-spin" />
                        ) : waiting || view.verification.selfConfirmed ? (
                          <Clock3 size={15} />
                        ) : null}
                        {primaryLabel}
                        {!busy &&
                          !waiting &&
                          !view.verification.selfConfirmed && (
                            <ArrowRight size={15} />
                          )}
                      </button>
                      {view.spot && !verificationStarted && (
                        <button
                          className="ft-quiet-action"
                          onClick={() => chooseSpot()}
                          disabled={locked}
                        >
                          Change spot
                        </button>
                      )}
                    </motion.div>
                  </AnimatePresence>
                  <CounterpartStatus
                    view={view}
                    venue={venue}
                    checkIn={counterpartCheckIn}
                    now={now}
                    online={online}
                  />
                  {confirmed && (
                    <>
                      <ZoneCheckIn
                        venue={venue}
                        checkIn={selfCheckIn}
                        now={now}
                        busy={busy}
                        disabled={locked}
                        onShare={(zoneId) =>
                          mutate("check-in", "PUT", {
                            zoneId,
                            shareMinutes: 15,
                          })
                        }
                        onRevoke={() => mutate("check-in", "DELETE")}
                      />
                      {route && (
                        <details className="ft-simple-directions">
                          <summary>
                            Directions <ChevronDown size={13} />
                          </summary>
                          <DirectionsPanel
                            venue={venue}
                            zoneId={view.spot!.zoneId}
                            route={route}
                            hasStart={!!selfCheckIn}
                          />
                        </details>
                      )}
                    </>
                  )}
                </>
              )}
            </RendezvousBottomSheet>
          </div>
          {!embedded && (
            <details className="ft-demo-controls">
              <summary>
                <Users size={13} />
                Demo account <ChevronDown size={12} />
              </summary>
              <div>
                <label htmlFor="ft-demo-account">
                  Review as either participant
                </label>
                <select
                  id="ft-demo-account"
                  value={view.viewerUserId}
                  disabled={busy}
                  onChange={(event) => {
                    setPicker(false);
                    setReviewSpot(false);
                    void switchAccount(event.target.value);
                  }}
                >
                  {participants.map((person) => (
                    <option value={person.id} key={person.id}>
                      {person.name}
                    </option>
                  ))}
                </select>
                <p>Two fictional attendees. Two independent choices.</p>
              </div>
            </details>
          )}
          <Dialog
            open={picker}
            onClose={() => {
              if (!busy) setPicker(false);
            }}
            title="Choose a meeting spot"
            description="You’re already connected. This simply chooses where to say hello."
          >
            <div className="ft-mini-content">
              <MeetingSpotPicker
                venue={venue}
                value={selectedZoneId}
                onChange={setSelectedZoneId}
              />
              {error && (
                <p className="ft-mini-error" role="alert">
                  {error}
                </p>
              )}
              <button
                className="ft-primary-action"
                disabled={locked}
                onClick={() => void proposeSpot()}
              >
                {busy ? "Saving…" : `Suggest ${selected?.label ?? "this spot"}`}
                <ArrowRight size={15} />
              </button>
            </div>
          </Dialog>
          <Dialog
            open={reviewSpot && !!incoming}
            onClose={() => {
              if (!busy) setReviewSpot(false);
            }}
            title={`Meet at ${spot?.label ?? "this spot"}?`}
            description={`${name} suggested this landmark. Your introduction is already approved.`}
          >
            <div className="ft-mini-content">
              <div className="ft-mini-landmark">
                <MapPin size={22} strokeWidth={1.4} />
                <strong>{spot?.label}</strong>
                <p>{spot?.description}</p>
              </div>
              {error && (
                <p className="ft-mini-error" role="alert">
                  {error}
                </p>
              )}
              <button
                className="ft-primary-action"
                disabled={locked}
                onClick={() => void acceptSpot()}
              >
                {busy ? "Saving…" : "That works for me"}
                <Check size={15} />
              </button>
              <button
                className="ft-quiet-action"
                disabled={busy}
                onClick={() => {
                  setReviewSpot(false);
                  chooseSpot();
                }}
              >
                Suggest another spot
              </button>
            </div>
          </Dialog>
        </>
      )}
    </div>
  );
}
