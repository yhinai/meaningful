# MeaningfulMeet — Find Twin

Find Twin extends an accepted introduction into a real-world rendezvous. It shares the existing app shell and meeting IDs. It does not introduce a second matching engine or meeting status model.

## Integration boundary

The existing twin engine owns introductions, participant IDs, and meeting status. The location adapter reads those records and rejects any meeting without both participants' approval. The unified conference workspace embeds Find Twin in a dialog alongside the live graph and connection rail. The isolated `FindTwinEntry` component remains available for legacy integrations. The former one-person completion control is replaced by this entry so the visible rendezvous flow requires both people to confirm they met.

New implementation is isolated under `src/features/find-twin/`, `src/components/find-twin/`, the Find Twin route, and specific location API routes. Existing discovery, network, negotiation, and meeting-acceptance handlers are unchanged.

## Design

Pure white surfaces, system typography, charcoal primary actions, quiet borders, and restrained warm map accents follow the existing MeaningfulMeet design. The floor plan is fictional and labeled **Demo Venue Map**. No representation of a real sponsor's office is intended.

On mobile, the map sits above an expandable meeting sheet; desktop uses a map and side panel. Landmark labels and text directions provide an accessible alternative to the map. Motion honors reduced-motion preferences. Check-ins are voluntary and self-reported; no device geolocation or heading is requested.

## Expected flow

1. Open the conference workspace after a mutually accepted introduction and select **Meet up**. The map opens in place; prior meeting approval is retained.
2. Propose a landmark such as Coffee Bar. Switch to the other participant using the clearly labeled demo account control and accept the same proposal version.
3. Optionally share a named current zone for up to 15 minutes. A route appears only when a start zone is known and configured walkable connections exist. Otherwise, show landmark directions.
4. Mark arrival. Both participants independently select **We met!**.
5. The completion adapter updates the original meeting, publishes metadata-only completion, and records one +50 XP award per participant. Refreshing does not award more points.

Check-ins can be revoked immediately. Expired, revoked, completed-meeting, or ended-event presence is not exposed through the normal read API or replayed as current presence. The public twin graph receives no zone data.

## API additions

All paths start with `/api/events/:eventId`.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/venue` | Public demo floor plan, landmarks, corridor graph |
| GET | `/meetings/:meetingId/rendezvous` | Participant-scoped rendezvous state |
| POST | `/meetings/:meetingId/rendezvous/propose` | Propose a landmark |
| POST | `/meetings/:meetingId/rendezvous/respond` | Respond to the current proposal version |
| PUT / DELETE | `/meetings/:meetingId/check-in` | Share / revoke own short-lived zone |
| POST | `/meetings/:meetingId/arrival` | Change own arrival state |
| POST | `/meetings/:meetingId/verification` | Confirm the face-to-face meeting |
| GET | `/meetings/:meetingId/location-stream` | Authorized SSE updates and reconnect |

## Honest demo limits

The existing app runs in explicit local guest-demo mode. The HTTP-only demo account cookie identifies the selected fictional participant; this is not production authentication. Local JSON persistence supports this single-process demo. Production requires replacing the session adapter with real authenticated sessions and applying a reviewed database migration with transactional storage and participant access policies. A supplied SQL migration is an implementation reference, not evidence of an applied production database.

Manual mutual confirmation is suitable for the hackathon demo, but does not prove physical proximity. The optional QR/native indoor-positioning work remains outside this P0. Relative venue coordinates are schematic drawing coordinates, never measured meters, bearings, or ETA. The reward is illustrative and cannot be redeemed; no sponsor or email fulfillment is connected.
