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

Conference attendees and twin conversations are fictional demo data. Live Omi captions and Gemini Meaningful Notes editions are optional integrations described below; neither runs until configured and explicitly requested. No external attendee records, authentication service, or graph database is configured. The score is a product heuristic, never a probability of success.

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

Find Twin includes a clearly labeled fictional venue floor plan and voluntary, expiring zone check-ins. There is no device geolocation, continuous tracking, UWB, browser audio recording, automated email sending, or real prize fulfillment. Meaningful Notes can receive captions from a separately running Omi audio bridge and optionally generate a private magazine using Gemini.

## Meaningful Notes: during and after the hello

Open **Conversation notes & live Omi** from the meeting map. After completion, **View moment** and the celebration’s **Keep the moment in Meaningful Notes** action open `/event/evt_demo/meetings/:meetingId/fieldnotes`. Each attendee gets their own private reflection, transcript, source-linked edition, and follow-up checklist. Notes can be saved while the meeting is accepted; edition generation requires a completed meeting.

The journal works without external services. Paste plain text (blank lines separate passages), or import a finalized Omi `.jsonl` / `.json` transcript. Partial captions are excluded, source IDs are deduplicated, and recording gaps stay visible. Imports replace the journal transcript. Editing the transcript clears its previous edition on save; edits to a reflection or follow-up checklist preserve it. Download exports the journal as JSON, and Print / save PDF prints the edition.

To connect the [Omi branch’s bridge](https://github.com/yhinai/meaningful/tree/omi), run that bridge separately using its own setup instructions. Set these in this app’s `.env.local`, then restart the app:

```dotenv
OMI_BRIDGE_URL=http://127.0.0.1:8787
OMI_BRIDGE_OWNER_USER_ID=usr_self
# Optional edition generation; choose an available Gemini text model for your account.
GEMINI_API_KEY=your-server-side-key
OMI_MAGAZINE_MODEL=your-gemini-model-id
```

`GOOGLE_API_KEY` is also accepted. `OMI_BRIDGE_URL` must be reachable from the Next.js server. Its `/listen-ws?mode=captions&replay=0` WebSocket is relayed as participant-authorized SSE; the bridge address and key stay server-side. This single-device integration permits only `OMI_BRIDGE_OWNER_USER_ID` to listen. Each account needs its own journal, but a second attendee cannot subscribe to that device. The browser does not capture a microphone or relay raw audio. The existing bridge and Omi phone configuration remain responsible for audio ingestion and Gemini transcription.

Start listening only after the people in the conversation agree. Capture begins with new captions; it does not import historical audio. On reconnect, the stream uses its last event ID for bounded bridge replay. Stop listening, add finalized passages, then save. Partial words remain ephemeral. Stopping the browser subscription does not stop the Omi device or its bridge. Captions not added and saved are lost when leaving the page. You may discard unsaved captions explicitly.

**Make my edition** sends only the saved transcript passages and gap count to the configured Gemini account after the attendee checks the consent box. Private reflections, profiles, location, and twin negotiations are excluded. Generation incurs normal API charges, has a 90-second timeout and no automatic paid retries, validates every cited source ID, and preserves the saved edition on provider or validation failure. A source link establishes traceability, not factual accuracy. No generation runs on page load, and no follow-up messages are sent.

Journals live under a separate per-meeting, per-viewer key in the existing local database. They are absent from the shared demo-state and experience endpoints. Writes use revision checks; a newer edit wins over an in-flight generation. Demo reset clears journals; deleting a profile removes its meeting journals. The same local single-process persistence and demo-cookie identity limits as the rest of the app apply. For production, replace these with authenticated accounts and durable storage, and use a host that supports the long-lived caption response.

Endpoints: `GET` / `PUT` `/api/events/:eventId/meetings/:meetingId/fieldnotes`, `POST` to that endpoint with `{revision,consent:true}` to generate, and `GET .../fieldnotes/live` for captions. `tests/fieldnotes.test.ts` verifies private storage, import validation, source references, failed/concurrent generations, and the actual bridge WebSocket → SSE protocol with a local fixture. Physical Omi capture and paid Gemini generation require configured services and are not claimed by the offline checks.

## Find Twin: after the digital introduction

The graph and connection rail share `/event/evt_demo/network`. Accepted connections open the embedded Find Twin experience without a page change. The standalone `/event/evt_demo/meetings/:meetingId/find` remains available for direct links. Legacy Matches, Meetings, and match-detail pages redirect into the unified conference workspace. Read [the continuous experience guide](docs/experience-flow.md) for the consent rules. The location slice is additive and isolated from discovery, scoring, negotiation, and meeting approval. Read [the integration guide](docs/find-twin.md) for the two-account walkthrough, privacy model, endpoints, and deployment limits.

Location records persist separately in `.data/find-twin.json`; `MEANINGFULMEET_LOCATION_DATA_FILE` overrides that path. The location-owned adapter is the only boundary that updates the original meeting after both people confirm. SSE is a participant-scoped invalidation channel: historical check-in events omit zone values, and the authorized current-state endpoint enforces expiry and revocation. A fixed venue event end also closes sharing.

The additive SQL migration under `supabase/migrations/` documents the production schema and participant access policies. It is not applied to a connected database. The running app continues to use explicit guest demo sessions and single-process local JSON persistence.

## Twin character

Cloud, Bunny, Cat, Fox, Bear, and Owl are code-native SVG companions with soft gradients, rosy cheeks, breathing, blinking, accessible greetings, and reduced-motion support. Choose your style in the twin overlay; the selection persists locally per demo account. Each attendee has a stable mini twin beside their photo. Working indicators reflect workflow state. See [character design](docs/twin-character.md).

The web typography uses the Apple system font stack with readable captions at 11 CSS pixels or larger and larger body text. These are web design choices inspired by [Apple’s typography guidance](https://developer.apple.com/design/human-interface-guidelines/typography), not a claim of native iOS Dynamic Type support.

### Meaningful Notes demo

The home-page **Meaningful Notes** button opens `/meaningful-notes`, which lists approved conversations and always offers **Try the demo**. Every journal also exposes a demo fallback. `/meaningful-notes/demo` works without meeting records, Omi, Gemini, API keys, or journal requests: **Play demo** simulates two people speaking, types their transcript, shows the magazine preparation stage, then reveals a prepared, source-linked edition. **Skip to magazine**, **Preview the magazine**, and **Replay demo** work independently. All demo content is explicitly fictional and kept in browser memory; it never writes to real journals or calls paid services.

### Separate magazine and photographs

The conversation journal and magazine are separate pages. After making an edition, **Open your magazine** opens `/event/evt_demo/meetings/:meetingId/fieldnotes/magazine`. The demo has its own photographed sample at `/meaningful-notes/demo/magazine`, with bundled AI-created conceptual photographs; these do not show actual attendees or a real event.

On real magazines, expand **Pictures for your edition** to search Wikimedia Commons by a public subject, inspect credits and licenses, and select a cover. Searches exclude unrecognized image hosts and non-reusable license categories; check each linked source for its reuse conditions. Selected photos and their credits persist with the private edition. Newly selected pictures become the cover; up to two earlier pictures appear with feature stories.

For AI image generation, configure `GEMINI_API_KEY` (or `GOOGLE_API_KEY`) and `OMI_MAGAZINE_IMAGE_MODEL` with an available image-capable Gemini model. **Generate AI image** requires separate consent and incurs normal API charges. It sends only the public subject words, not the transcript or private reflection. Generated images are labeled conceptual, capped at 4 MiB each, and kept with the private journal (up to three images). No image generation runs automatically. Failed images preserve the magazine. Online-photo search works without a Gemini key. Existing local JSON-storage and demo-cookie limits still apply.
### Omi private journal and FalkorDB

The isolated `/omi-lab` workspace reviews finalized Omi imports, extracts evidence-linked insights, and creates a private two-page magazine with optional FalkorDB synchronization. It is a token-protected single-operator lab; fictional extraction works offline, while real analysis requires OpenAI credentials. Public sharing is disabled. See [setup, verification, and current limitations](docs/falkordb.md).
