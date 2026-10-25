# FalkorDB conference graph

Run from this checkout:

```sh
npm ci
npm run falkordb:verify
```

The verifier reads `FALKORDB_URL` from the root `.env` (ignored by Git), requires TLS, and uses the official Node.js FalkorDB client. It never logs connection credentials. Save credentials only in this server-side file; `.env.example` contains placeholders.

The script checks connectivity, seeds a fictional six-node/six-edge sample with all five required labels and relationship types, verifies a second seed produces no duplicates, and returns an explanatory three-hop path. It does not delete existing graph data. The sample namespace is `meaningfulmeet-conference-demo-v1`; it is not evidence of real conversations or meetings.

Open https://browser.falkordb.com, log in using the connection URL, select `conference`, and run:

```cypher
MATCH p=(a:Attendee)-[:MET]->(s:Speaker)-[:PRESENTS]->(t:Talk)-[:ABOUT]->(topic:Topic)
WHERE a.sample = 'meaningfulmeet-conference-demo-v1'
  AND (a)-[:INTERESTED_IN]->(topic)
RETURN p
```

This is the verified database foundation for the Omi magazine integration. Live transcript import, approved insight storage, and magazine generation are separate application work; this setup does not ingest private recordings or claim those features are complete.

References: https://docs.falkordb.com/llms.txt and https://github.com/FalkorDB/falkordb-ts.

## Omi magazine workflow

Start MeaningfulMeet on a free localhost port:

```sh
npm run build
npm run start -- --hostname 127.0.0.1 --port 3007
```

Open `http://127.0.0.1:3007/omi-lab` (also linked from the app footer). Enter `OMI_LAB_TOKEN` from this checkout's ignored `.env`. Keep the token private; it is held in browser memory and cleared by Lock. This is a **single-operator lab**, not multi-user authentication. No public magazine route or sharing link is provided. A production account/authorization adapter is still required before opening access to attendees.

1. Choose the fictional sample, or import an Omi finalized transcript. The existing bridge exports `logs/omi_transcript_events.jsonl`; use a short selection, up to 60 KB/80 segments. This is a manual import, not an always-on subscription. JSONL partials and gap events are excluded. Plain text is treated as finalized, user-supplied text.
2. Edit/redact source text and review segments. Remove sensitive segments, then explicitly approve analysis. Recording and STT processing consent must already exist: this review cannot retroactively authorize the bridge's earlier Gemini processing.
3. Fictional samples use a deterministic local extractor, clearly marked **DEMO ONLY**. Real imports require server-side `OPENAI_API_KEY` and `OPENAI_MODEL`; they use the Responses API with an actual `getApprovedTranscriptSegments` tool exchange, strict structured output, source/quote validation, two requests maximum, and a 40-second deadline. No automatic retry or silent demo fallback occurs. Live OpenAI execution has not been verified without credentials. TrueForge orchestration is not integrated.
4. Review/edit insight descriptions and check the ones to keep. Approval creates a private, light-theme, two-page magazine. Only evidence supporting approved insights is saved. Saved editions can be reopened and exported privately.
5. FalkorDB receives `Magazine → HAS_INSIGHT → MemoryInsight → SUPPORTED_BY → TranscriptSegment` records in `conference`, under the isolated `meaningfulmeet-private-omi-v1` scope. Parameterized MERGE writes are idempotent. Graph failure leaves an explicit failed status and a retryable local edition. Evidence lookup returns actual graph paths, not inferred meeting claims.
6. Delete removes the edition's remote graph nodes before reporting local deletion. A failed/ambiguous remote write still requires remote cleanup. If remote cleanup fails, deletion is reported pending and may be retried. Source review changes do not silently update existing editions: delete any superseded edition explicitly, then generate a new approved snapshot. Independently exported files remain under the user's control.

Local edition files live under ignored `.data/omi-magazine/` with restrictive file permissions. The local filesystem is appropriate for a persistent, single-instance Node server; do not deploy this persistence unchanged to ephemeral/serverless hosting. The operation lock is process-local and does not provide distributed job coordination.

### DNS issue found on this machine

The system resolver returned `172.235.51.161` / `172.236.227.100`, which timed out. Google's DNS-over-HTTPS returned a reachable address and the unchanged full `falkors://` URL authenticated successfully. This checkout enables `FALKORDB_DNS_MODE=google-doh` in its ignored `.env`. The resolver sends only the hostname to `https://dns.google/resolve`; the client still validates the TLS certificate against the original hostname. No IP is hardcoded and TLS verification is never disabled. Leave this optional setting unset on machines with working DNS.

### Repeatable verification

With the built app running on port 3007:

```sh
npm test
npm run typecheck
npm run falkordb:verify
npm run omi:verify-live
```

`omi:verify-live` accepts `OMI_LAB_TEST_URL` only for localhost. It creates fictional test data, verifies private access, approval boundaries, actual graph paths, idempotent synchronization, omitted unapproved evidence, and local/remote deletion. It never analyzes a real recording or sends a request to OpenAI. Test editions are cleaned up; the named conference fixture remains for exploration.

To draw saved magazine evidence in the graph browser:

```cypher
MATCH p=(m:Magazine {scope:'meaningfulmeet-private-omi-v1'})
  -[:HAS_INSIGHT]->(:MemoryInsight)-[:SUPPORTED_BY]->(:TranscriptSegment)
RETURN p LIMIT 80
```

The conference fixture and magazine records are separate. Fixture `MET` edges are explicitly synthetic; the magazine importer does not invent real meeting edges from transcript mentions.

### Handoff from the current Meaningful Notes pages

Use **Download** in the existing meeting journal, then import that `.json` file in `/omi-lab`. Only its `transcript` field is extracted; private reflections, counterpart/profile metadata, and previously generated prose are excluded. You review source segments and approve insights again before anything reaches the graph. The existing meeting pages, live captions, Gemini provider configuration, images, and demo continue to operate independently; this lab does not silently copy their data.
