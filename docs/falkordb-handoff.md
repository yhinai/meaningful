# FalkorDB handoff

Graph: `conference`. Namespace: `meaningfulmeet_conference_demo_v1`.
Client: official `falkordb` Node.js SDK, tested version 6.9.2; Node 22+.
Connection: `FALKORDB_URL` from ignored server `.env`. The full `falkors://` URL is passed to the SDK, which selects TLS. Certificate verification stays enabled. Plaintext `redis://` and `falkor://` are rejected by the app adapter. No URL/password is exported to the browser, proof artifact, or logs.

## Reproduce

Run `npm run sponsor:falkordb` from the project root. It reads `.env`, performs `RETURN 1`, seeds only namespaced synthetic fixtures with MERGE, counts actual nodes and explicit relationships, queries returned paths, and reruns the seed to prove idempotence. No deletion is performed. The receipt in `artifacts/falkordb-check.json` contains measured counts, returned names/types/hops, a timestamp and a browser Cypher query; it has no credentials.

## Typed adapters

- `conferenceGraph`, `getMatchGraphEvidence`, `closeFalkorDB` from `@/features/falkordb/server`.
- `seedConferenceGraph`, `graphCounts`, `conferencePathProof` from `@/features/falkordb/seed`.
- `ConferenceGraphEvidence`, `GraphPathEvidence` from `@/features/falkordb/types`.
- Fixed, parameterized queries from `@/features/falkordb/queries`.

Connection details use the read-only `/api/integrations/falkordb` endpoint. It returns a live path, fetch time, graph name and explicit synthetic-dataset label, or an honest unconfigured/unavailable state. Responses are bounded to three paths and cached for one minute. IDs are validated against opted-in demo attendees. This endpoint cannot run arbitrary browser Cypher or seed/delete data.

## Data boundaries

Only public fictional fixture fields are seeded. The actual user profile, local notes, Omi transcript, sharing settings, introduction approvals and location check-ins are not uploaded. Cloud evidence is a conference-demo proof and does not replace consent-aware match scoring or approve meetings. The MET edge joins `lab_alex` and `lab_jordan` only; it does not assert that real people met.

Existing data outside our namespace is preserved. Counts printed for the whole conference graph may include preexisting nodes and edges; namespace counts are reported separately. Real production matching would need opt-in ingestion, per-user graph authorization, consent revocation/deletion and a durable orchestration boundary before replacing the local fixture model.

## Browser

Open https://browser.falkordb.com, choose URL login, paste the saved connection URL locally, and select `conference`. Paste `BROWSER_PATH_QUERY` from the query module or receipt. It returns the attendee → topic ← talk ← speaker path, its room path and optional synthetic MET path as graph entities for visual display.

Official references: https://docs.falkordb.com/llms.txt and https://github.com/FalkorDB/falkordb-ts
