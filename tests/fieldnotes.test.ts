import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createServer } from "node:http";
import { createHash } from "node:crypto";
import { NextRequest } from "next/server";
import {
  parseTranscript,
  validateEdition,
  type Edition,
} from "../src/features/fieldnotes/model";

const transcript = [
  {
    type: "transcript",
    event_id: "first",
    text: "We discussed making time for thoughtful customer interviews.",
    is_final: true,
  },
  {
    type: "partial",
    utterance_id: "turn2",
    text: "Maybe we should",
    is_final: false,
  },
  { type: "gap", event_id: "gap1", text: "A passage is missing." },
  {
    type: "transcript",
    event_id: "second",
    text: "I will send you my interview guide tomorrow.",
  },
  {
    type: "transcript",
    event_id: "first",
    text: "A duplicate must not replace the original.",
  },
]
  .map((item) => JSON.stringify(item))
  .join("\n");
const edition: Edition = {
  title: "Room for better questions",
  standfirst:
    "A conversation about listening to customers, and a guide to share.",
  sections: [
    {
      title: "A little more time to listen",
      summary: "The conversation explored thoughtful customer interviews.",
      source_ids: ["first"],
    },
  ],
  takeaways: [
    {
      text: "Customer interviews were a shared interest.",
      source_ids: ["first"],
    },
  ],
  followups: [
    {
      text: "Send the interview guide tomorrow.",
      source_ids: ["second"],
      kind: "commitment",
    },
  ],
};

test("Omi imports retain final evidence, deduplicate IDs, and expose recording gaps", () => {
  const parsed = parseTranscript(transcript);
  assert.equal(parsed.sources.length, 2);
  assert.equal(parsed.gapCount, 1);
  assert.match(parsed.sources[0].text, /thoughtful/);
  assert.equal(
    parseTranscript("A useful conversation.\n\nA follow-up idea.").sources
      .length,
    2,
  );
  assert.equal(
    parseTranscript("[2026-10-24 12:00:00] A plain Omi log line.").sources
      .length,
    1,
  );
  assert.deepEqual(parseTranscript(""), { sources: [], gapCount: 0 });
  assert.throws(
    () => parseTranscript('{"type":"transcript",bad}'),
    /invalid JSON/,
  );
  assert.throws(
    () => parseTranscript('{"type":"partial","text":"unfinished"}'),
    /No finalized/,
  );
  assert.throws(
    () => parseTranscript('[{"event_id":{},"text":"words"}]'),
    /IDs/,
  );
  assert.throws(() => parseTranscript("x".repeat(12001)), /12,000/);
  assert.equal(validateEdition(edition, parsed.sources).title, edition.title);
  assert.throws(
    () =>
      validateEdition(
        {
          ...edition,
          takeaways: [{ text: "Fabricated", source_ids: ["missing"] }],
        },
        parsed.sources,
      ),
    /unknown passage/,
  );
});

test("private journal lifecycle, HTTP access, generation conflicts, and live bridge protocol", async (t) => {
  const directory = await mkdtemp(
    path.join(tmpdir(), "meaningful-fieldnotes-"),
  );
  process.env.MEANINGFULMEET_DATA_FILE = path.join(directory, "demo.json");
  const { mutateDatabase, getDatabase, resetDatabase } =
    await import("../src/lib/store");
  const { saveJournal, readJournal, buildJournal } =
    await import("../src/features/fieldnotes/server");
  const api =
    await import("../src/app/api/events/[eventId]/meetings/[meetingId]/fieldnotes/route");
  const live =
    await import("../src/app/api/events/[eventId]/meetings/[meetingId]/fieldnotes/live/route");
  const context = (meetingId = "journal", eventId = "evt_demo") => ({
    params: Promise.resolve({ meetingId, eventId }),
  });
  const request = (
    viewer = "usr_self",
    method = "GET",
    body?: unknown,
    signal?: AbortSignal,
  ) =>
    new NextRequest(
      "http://localhost/api/events/evt_demo/meetings/journal/fieldnotes",
      {
        method,
        headers: {
          cookie: `demo_user=${viewer}`,
          "Content-Type": "application/json",
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
        signal,
      },
    );
  const save = (
    revision: number,
    note = "My private reflection",
    text = transcript,
    viewer = "usr_self",
  ) =>
    saveJournal("evt_demo", "journal", viewer, {
      revision,
      note,
      transcript: text,
      completedFollowups: [],
    });
  try {
    await mutateDatabase((db) => {
      const meeting = {
        id: "journal",
        eventId: "evt_demo",
        matchId: "m",
        ownerUserId: "usr_self",
        candidateId: "usr_01",
        requesterAccepted: true,
        recipientAccepted: true,
        status: "completed" as const,
        createdAt: new Date().toISOString(),
      };
      db.meetings.push(
        meeting,
        {
          ...meeting,
          id: "pending",
          status: "awaiting_approval",
          recipientAccepted: false,
        },
        { ...meeting, id: "accepted", status: "accepted" },
      );
    });
    await t.test(
      "HTTP access is limited to approved participants, and device ownership is separate",
      async () => {
        assert.equal((await api.GET(request(), context())).status, 200);
        assert.equal((await api.GET(request("usr_02"), context())).status, 404);
        assert.equal(
          (await api.GET(request(), context("pending"))).status,
          403,
        );
        assert.equal(
          (await api.GET(request(), context("journal", "other-event"))).status,
          404,
        );
        const response = await api.GET(request(), context());
        assert.match(response.headers.get("Cache-Control")!, /no-store/);
        assert.equal((await live.GET(request(), context())).status, 403);
        assert.equal(
          (
            await api.POST(
              request("usr_self", "POST", { revision: 0, consent: false }),
              context(),
            )
          ).status,
          400,
        );
        const malformed = await api.PUT(
          request("usr_self", "PUT", {
            revision: 0,
            note: "",
            transcript: '{"oops"',
            completedFollowups: [],
          }),
          context(),
        );
        assert.equal(malformed.status, 400);
      },
    );
    await t.test(
      "notes persist per viewer and are absent from the public demo state",
      async () => {
        const saved = await save(0);
        assert.equal(saved.revision, 1);
        assert.equal(
          (await readJournal("evt_demo", "journal", "usr_01")).journal.note,
          "",
        );
        await save(
          0,
          "The other person's reflection",
          "Their own words",
          "usr_01",
        );
        assert.equal(
          (await readJournal("evt_demo", "journal", "usr_self")).journal.note,
          "My private reflection",
        );
        const { getState } = await import("../src/lib/engine");
        assert.ok(
          !JSON.stringify(await getState("usr_01")).includes(
            "My private reflection",
          ),
        );
        await assert.rejects(save(0, "Stale edit"), /another window/);
      },
    );
    await t.test(
      "generation cites evidence, preserves failed editions, and resets only after transcript changes",
      async () => {
        const built = await buildJournal(
          "evt_demo",
          "journal",
          "usr_self",
          1,
          async (sources, gaps) => {
            assert.equal(sources.length, 2);
            assert.equal(gaps, 1);
            assert.ok(
              !JSON.stringify(sources).includes("My private reflection"),
            );
            return edition;
          },
        );
        assert.equal(built.revision, 2);
        await assert.rejects(
          buildJournal("evt_demo", "journal", "usr_self", 2, async () => {
            throw Error("Provider unavailable");
          }),
          /Provider unavailable/,
        );
        assert.deepEqual(
          (await readJournal("evt_demo", "journal", "usr_self")).journal
            .edition,
          edition,
        );
        await assert.rejects(
          buildJournal("evt_demo", "journal", "usr_self", 2, async () => ({
            ...edition,
            takeaways: [{ text: "Invented", source_ids: ["unknown"] }],
          })),
          /unknown passage/,
        );
        const noted = await save(2, "Updated personal note");
        assert.deepEqual(noted.edition, edition);
        const checked = await saveJournal("evt_demo", "journal", "usr_self", {
          revision: 3,
          note: noted.note,
          transcript,
          completedFollowups: [0],
        });
        assert.deepEqual(checked.completedFollowups, [0]);
        const changed = await save(4, noted.note, "A different conversation.");
        assert.equal(changed.edition, undefined);
        assert.deepEqual(changed.completedFollowups, []);
        await assert.rejects(
          buildJournal(
            "evt_demo",
            "accepted",
            "usr_self",
            0,
            async () => edition,
          ),
          /Complete the meeting/,
        );
      },
    );
    await t.test(
      "an edit during generation wins and simultaneous builds are rejected",
      async () => {
        const saved = await save(5);
        let finish!: (value: Edition) => void;
        let started!: () => void;
        const ready = new Promise<void>((resolve) => {
          started = resolve;
        });
        const building = buildJournal(
          "evt_demo",
          "journal",
          "usr_self",
          saved.revision,
          () => {
            started();
            return new Promise<Edition>((resolve) => {
              finish = resolve;
            });
          },
        );
        await ready;
        await assert.rejects(
          buildJournal(
            "evt_demo",
            "journal",
            "usr_self",
            saved.revision,
            async () => edition,
          ),
          /already being prepared/,
        );
        await save(saved.revision, "A newer note while generating");
        finish(edition);
        await assert.rejects(building, /changed while/);
        assert.equal(
          (await readJournal("evt_demo", "journal", "usr_self")).journal.note,
          "A newer note while generating",
        );
      },
    );
    await t.test(
      "real WebSocket bridge frames become private SSE captions without audio/history leakage",
      async () => {
        const server = createServer();
        let requested = "";
        server.on("upgrade", (req, socket) => {
          requested = req.url!;
          const accept = createHash("sha1")
            .update(
              req.headers["sec-websocket-key"] +
                "258EAFA5-E914-47DA-95CA-C5AB0DC85B11",
            )
            .digest("base64");
          socket.write(
            `HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`,
          );
          const send = (value: unknown) => {
            const payload = Buffer.from(JSON.stringify(value));
            const header =
              payload.length < 126
                ? Buffer.from([0x81, payload.length])
                : Buffer.from([
                    0x81,
                    126,
                    payload.length >> 8,
                    payload.length & 255,
                  ]);
            socket.write(Buffer.concat([header, payload]));
          };
          send({ type: "partial", text: "Draft speech", utterance_id: "turn" });
          send({
            type: "transcript",
            text: "Final words",
            event_id: "live-final",
            utterance_id: "turn",
            raw_audio: "must not leak",
          });
          send({
            type: "transcript",
            text: "Not final",
            event_id: "bad",
            is_final: false,
          });
          send({
            type: "status",
            audio_active: true,
            gemini_key: "must not leak",
          });
          socket.on("data", (data) => {
            if ((data[0] & 15) === 8) socket.end(Buffer.from([0x88, 0]));
          });
          socket.on("error", () => {});
          socket.on("end", () => socket.destroy());
        });
        await new Promise<void>((resolve) =>
          server.listen(0, "127.0.0.1", resolve),
        );
        const address = server.address() as { port: number };
        process.env.OMI_BRIDGE_URL = `http://127.0.0.1:${address.port}`;
        process.env.OMI_BRIDGE_OWNER_USER_ID = "usr_self";
        const abort = new AbortController();
        try {
          assert.equal(
            (await live.GET(request("usr_01"), context())).status,
            403,
          );
          const response = await live.GET(
            request("usr_self", "GET", undefined, abort.signal),
            context(),
          );
          assert.equal(response.status, 200);
          const reader = response.body!.getReader();
          let output = "";
          const timeout = setTimeout(() => abort.abort(), 5000);
          try {
            while (!output.includes("Audio arriving")) {
              const chunk = await reader.read();
              if (chunk.done) break;
              output += new TextDecoder().decode(chunk.value);
            }
            assert.match(requested, /mode=captions/);
            assert.match(requested, /replay=0/);
            assert.match(output, /Draft speech/);
            assert.match(output, /Final words/);
            assert.match(output, /id: live-final/);
            assert.ok(!output.includes("must not leak"));
            assert.ok(!output.includes("Not final"));
            assert.ok(
              !JSON.stringify(await getDatabase()).includes("Final words"),
            );
          } finally {
            clearTimeout(timeout);
            await reader.cancel();
          }
        } finally {
          abort.abort();
          server.closeAllConnections();
          await new Promise<void>((resolve) => server.close(() => resolve()));
          delete process.env.OMI_BRIDGE_URL;
          delete process.env.OMI_BRIDGE_OWNER_USER_ID;
        }
      },
    );
    await t.test(
      "the configured Gemini SDK request produces validated source-linked editions",
      async (t) => {
        const oldKey = process.env.GEMINI_API_KEY;
        const oldModel = process.env.OMI_MAGAZINE_MODEL;
        process.env.GEMINI_API_KEY = "fixture-key-not-a-real-credential";
        process.env.OMI_MAGAZINE_MODEL = "fixture-model";
        let output: unknown = edition;
        let sent = "";
        t.mock.method(
          globalThis,
          "fetch",
          async (_input: unknown, init?: RequestInit) => {
            sent = String(init?.body);
            return Response.json({
              candidates: [
                {
                  content: {
                    role: "model",
                    parts: [{ text: JSON.stringify(output) }],
                  },
                  finishReason: "STOP",
                },
              ],
              usageMetadata: {
                promptTokenCount: 20,
                candidatesTokenCount: 30,
                totalTokenCount: 50,
              },
            });
          },
        );
        try {
          const { generateEdition } =
            await import("../src/features/fieldnotes/generate");
          assert.deepEqual(
            await generateEdition(parseTranscript(transcript).sources, 1),
            edition,
          );
          assert.match(sent, /gap_count/);
          assert.match(sent, /original source_ids/);
          assert.ok(!sent.includes("My private reflection"));
          output = {
            ...edition,
            takeaways: [{ text: "Unsupported", source_ids: ["unknown"] }],
          };
          await assert.rejects(
            generateEdition(parseTranscript(transcript).sources, 1),
            /unknown passage/,
          );
        } finally {
          if (oldKey === undefined) delete process.env.GEMINI_API_KEY;
          else process.env.GEMINI_API_KEY = oldKey;
          if (oldModel === undefined) delete process.env.OMI_MAGAZINE_MODEL;
          else process.env.OMI_MAGAZINE_MODEL = oldModel;
        }
      },
    );
    await t.test("reset removes all private journal records", async () => {
      await resetDatabase();
      assert.deepEqual((await getDatabase()).fieldnotes, {});
    });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
