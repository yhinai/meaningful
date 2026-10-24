# MeaningfulMeet

A local, mobile-first conference networking experience built with Next.js App Router, React, TypeScript, Tailwind, Motion, and React Flow. The visual system uses a pure-white background, Apple-inspired system typography, quiet gray borders, black primary actions, and accessible reduced-motion behavior. The main page starts the conference, introduces your soft animated creature twin, and lets you set a conference intention. One conference workspace combines the live graph with connection cards. Profiles, twin details, introductions, feedback, and meeting maps open in animated overlays; new permissions use compact popups. Twin training remains on its own linked page.

## Run

```sh
npm install
npm run dev
```

Open http://localhost:3000. Validate with `npm test`, `npm run typecheck`, and `npm run build`.

## Demo workflow

1. Train your twin and explicitly choose share permissions.
2. Set conference goals; these are stored separately from the permanent twin profile.
3. Start scouting. The conference contains 100 fictional opt-in attendees. Each Scout reserves up to nine previously unscouted eligible people, using a deterministic rubric and six-message seeded transcript replays. Earlier discoveries and matches stay in your circle.
4. Inspect the network, transcripts, and score evidence. Only scores of at least 80 qualify as suggestions. Verified commitment constraints can reduce scores; a repeated Scout never recycles an earlier candidate. The final batch can contain fewer than nine when the eligible pool runs out.
5. Request an introduction. It stays awaiting approval. Switch to the recipient's demo account and explicitly accept; only then does it become an accepted meeting.
6. In the conference workspace, select **Meet up** on an accepted connection. The map opens in place without asking for meeting approval again. Agree on a landmark, optionally share a self-reported zone through a small permission popup, mark arrival, and independently confirm you met from both accounts. This completes the original meeting and awards each participant +50 demo XP once. Details and private feedback are also available in focused popups.

Every attendee and conversation is fictional demo data. No live AI providers, external attendee records, authentication service, or graph database is configured. The product exposes these integration limits directly. The score is a product heuristic, never a probability of success.

## Persistence and events

Local records live in `.data/demo.json` (gitignored). File writes are serialized and atomically renamed. Set `MEANINGFULMEET_DATA_FILE` to override the path. A run snapshots profile version and consent. Revoking a share permission stops an active run; new runs use the new permissions. Refresh resumes the persisted run, and SSE supports `Last-Event-ID` or `?lastSeq=N` replay. Restarting the development process resumes unfinished fixture workflows on the next state request.

This storage is intended for a single-process demo. Production requires transactional durable storage, real authentication and event membership checks, row-level authorization, distributed rate limits, an outbox/worker for durable orchestration, and provider adapters. Demo account switching uses an HTTP-only cookie and is deliberately not production authentication.

## API

All event routes use `evt_demo`. Demo mode is explicit throughout.

| Method | Route | Purpose |
| --- | --- | --- |
| GET / PATCH / DELETE | `/api/me/twin` | Read, update, delete twin |
| GET / PUT | `/api/events/evt_demo/goals` | Event-specific goals |
| POST | `/api/events/evt_demo/twin-runs` | Start bounded workflow; supports `Idempotency-Key` |
| GET | `/api/events/evt_demo/twin-runs/:id` | Run and counters |
| GET | `/api/events/evt_demo/twin-runs/:id/graph` | Authorized graph snapshot |
| GET | `/api/events/evt_demo/twin-runs/:id/stream` | Persisted event replay and live SSE |
| GET | `/api/events/evt_demo/matches` | Match suggestions |
| GET | `/api/events/evt_demo/matches/:id` | Score and evidence |
| POST | `/api/events/evt_demo/matches/:id/request` | Request introduction |
| GET | `/api/events/evt_demo/meetings` | Owned and incoming meetings |
| POST | `/api/events/evt_demo/meetings/:id/respond` | Recipient-only approval `{accept:true}` |
| POST | `/api/events/evt_demo/meetings/:id/feedback` | Private `{relevance:1..5,note}` |
| GET | `/api/events/evt_demo/my-experience` | Goals, approved meetings, explanations, integration events |
| GET | `/api/demo/state` | UI demo state |
| POST | `/api/demo/action` | Explicit fixture actions and account switching |

Demo actions: `start-run`, `request-intro` (`matchId`), `decline-match` (`matchId`), `switch-user` (`userId`), `respond-meeting` (`meetingId`, `accept`), `complete-meeting` (`meetingId`), `feedback` (`meetingId`, `relevance`, `note`), `reset`.

## Integration boundaries

FalkorDB, Supabase, TrueForge, OpenAI, Bright Data, and Qodo are unconfigured. Evidence paths are derived locally from approved fixture fields, not presented as FalkorDB query results. Agent conversations are clearly labeled seeded replays rather than fabricated provider successes. `meeting.accepted`, `meeting.completed`, and `meeting.feedback_submitted` events contain stable IDs, timestamps, and consent scope. The experience endpoint excludes raw private profiles and negotiation transcripts.

Find Twin includes a clearly labeled fictional venue floor plan and voluntary, expiring zone check-ins. There is no device geolocation, continuous tracking, UWB, audio recording, automated email sending, real prize fulfillment, or magazine generation.

## Find Twin: after the digital introduction

The graph and connection rail share `/event/evt_demo/network`. Accepted connections open the embedded Find Twin experience without a page change. The standalone `/event/evt_demo/meetings/:meetingId/find` remains available for direct links. Legacy Matches, Meetings, and match-detail pages redirect into the unified conference workspace. Read [the continuous experience guide](docs/experience-flow.md) for the consent rules. The location slice is additive and isolated from discovery, scoring, negotiation, and meeting approval. Read [the integration guide](docs/find-twin.md) for the two-account walkthrough, privacy model, endpoints, and deployment limits.

Location records persist separately in `.data/find-twin.json`; `MEANINGFULMEET_LOCATION_DATA_FILE` overrides that path. The location-owned adapter is the only boundary that updates the original meeting after both people confirm. SSE is a participant-scoped invalidation channel: historical check-in events omit zone values, and the authorized current-state endpoint enforces expiry and revocation. A fixed venue event end also closes sharing.

The additive SQL migration under `supabase/migrations/` documents the production schema and participant access policies. It is not applied to a connected database. The running app continues to use explicit guest demo sessions and single-process local JSON persistence.

## Twin character

Cloud, Bunny, Cat, Fox, Bear, and Owl are code-native SVG companions with soft gradients, rosy cheeks, breathing, blinking, accessible greetings, and reduced-motion support. Choose your style in the twin overlay; the selection persists locally per demo account. Each attendee has a stable mini twin beside their photo. Working indicators reflect workflow state. See [character design](docs/twin-character.md).

The web typography uses the Apple system font stack with readable captions at 11 CSS pixels or larger and larger body text. These are web design choices inspired by [Apple’s typography guidance](https://developer.apple.com/design/human-interface-guidelines/typography), not a claim of native iOS Dynamic Type support.
