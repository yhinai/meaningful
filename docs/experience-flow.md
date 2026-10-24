# MeaningfulMeet — a continuous connection journey

The conference starts at the main page with the event, intention, and Pearl twin character. A single workspace at `/event/evt_demo/network` combines the live network graph and the attendee’s current connections. Tapping a graph node opens a profile overlay; selecting an approved connection opens its meeting map. Details, new permissions, and rendezvous all stay in focused dialogs or sheets. Training stays on its own linked page. Legacy Matches and Meetings routes redirect to this same workspace.

## Consent is specific to an action

| Current state               | Next action                | Permission behavior                                                                      |
| --------------------------- | -------------------------- | ---------------------------------------------------------------------------------------- |
| Suggested person            | Send an introduction       | A small dialog explains what approved profile information is shared.                     |
| Incoming introduction       | Accept or decline          | The invited attendee makes their own choice.                                             |
| Both attendees accepted     | Meet up                    | Open the map immediately. Do not ask either person to accept the meeting again.          |
| New or changed meeting spot | Agree on that spot         | The other attendee approves the proposed landmark. This never resets meeting acceptance. |
| Optional zone check-in      | Share for up to 15 minutes | Ask explicitly in a compact popup. Sharing remains off until the attendee chooses it.    |
| At the meeting              | Confirm “We met”           | Each person confirms independently. Completing the meeting awards points once.           |

A meeting approval is permission to meet, not permission to track someone. The app does not request device geolocation. A shared zone is self-reported, visible only to the approved counterpart, revocable immediately, and subject to server-enforced expiry.

## One person, one current connection

Repeated scouting runs may produce several suggestions for one candidate. The UI groups them by counterpart and treats authoritative meeting records as the current relationship:

- A completed meeting is shown as met, not as a new suggestion.
- A mutually accepted meeting opens the existing rendezvous immediately.
- An outgoing request remains waiting; an incoming request allows only its recipient to respond.
- A historical declined introduction must not be relabeled as accepted or ready because another suggestion exists.
- Incoming meetings still need a card even when the viewer has no match record of their own.

Existing API guards remain authoritative when a dialog opens. A score does not grant meetup or location access, and a popup does not silently accept for the other person.

## Verification

`tests/simplified-flow.test.ts` checks that changing or declining a meeting spot preserves the original accepted meeting, that repeated suggestions reuse existing consent, and that optional zone sharing never changes the public graph. The existing Find Twin tests cover one-sided approval guards, authorization, TTL, revocation, concurrency, two-person verification, and duplicate reward prevention.

The graph and connection rail use the same controller and actual SSE-backed run state. Human approval remains authoritative across scouting runs, while historical replay only shows the recorded prefix. The main Start conference action resumes the existing conference without restarting a completed run unless the intention has changed.
