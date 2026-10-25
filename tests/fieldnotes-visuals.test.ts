import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { NextRequest } from "next/server";
import { makeDemoJournal } from "../src/features/fieldnotes/demo";
import {
  createIllustration,
  searchPhotos,
  webVisualSchema,
} from "../src/features/fieldnotes/visuals";

const photo = {
  url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/ab/Notebook.jpg/1400px-Notebook.jpg",
  alt: "A notebook and coffee",
  kind: "web" as const,
  credit: "Sample photographer",
  sourceUrl: "https://commons.wikimedia.org/wiki/File:Notebook.jpg",
  license: "CC0",
};

test("photo search keeps credited reusable pictures and excludes unsafe URLs and licenses", async (t) => {
  let sent = "";
  t.mock.method(globalThis, "fetch", async (input: unknown) => {
    sent = String(input);
    const info = {
      thumburl: photo.url,
      descriptionurl: photo.sourceUrl,
      extmetadata: {
        ObjectName: { value: photo.alt },
        Artist: {
          value: '<a href="https://example.com">Sample photographer</a>',
        },
        LicenseShortName: { value: "CC0" },
      },
    };
    return Response.json({
      query: {
        pages: {
          1: { title: "File:Notebook.jpg", imageinfo: [info] },
          2: {
            title: "File:Restricted.jpg",
            imageinfo: [
              {
                ...info,
                extmetadata: {
                  ...info.extmetadata,
                  LicenseShortName: { value: "CC BY-NC 4.0" },
                },
              },
            ],
          },
          3: {
            title: "File:Unsafe.jpg",
            imageinfo: [
              { ...info, thumburl: "https://untrusted.example/image.jpg" },
            ],
          },
        },
      },
    });
  });
  assert.deepEqual(await searchPhotos("notebook coffee"), [photo]);
  assert.match(sent, /notebook\+coffee/);
  assert.ok(
    !webVisualSchema.safeParse({ ...photo, url: "javascript:alert(1)" })
      .success,
  );
  assert.ok(
    !webVisualSchema.safeParse({
      ...photo,
      url: "https://thumb.wikimedia.org.evil.example/photo.jpg",
    }).success,
  );
  assert.ok(
    !webVisualSchema.safeParse({ ...photo, sourceUrl: "https://example.com" })
      .success,
  );
});

test("configured AI image calls use the subject only and return a labeled image", async (t) => {
  const oldKey = process.env.GEMINI_API_KEY;
  const oldModel = process.env.OMI_MAGAZINE_IMAGE_MODEL;
  process.env.GEMINI_API_KEY = "fixture-only-not-a-real-key";
  process.env.OMI_MAGAZINE_IMAGE_MODEL = "fixture-image-model";
  let sent = "";
  let complete = true;
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
              parts: complete
                ? [{ inlineData: { mimeType: "image/png", data: "aW1hZ2U=" } }]
                : [{ text: "No image available" }],
            },
            finishReason: "STOP",
          },
        ],
        usageMetadata: {
          promptTokenCount: 10,
          candidatesTokenCount: 10,
          totalTokenCount: 20,
        },
      });
    },
  );
  try {
    const image = await createIllustration("notebook and coffee");
    assert.equal(image.kind, "ai");
    assert.equal(image.url, "data:image/png;base64,aW1hZ2U=");
    assert.match(image.credit, /not event photography/);
    assert.match(sent, /notebook and coffee/);
    assert.ok(!sent.includes("Private reflection"));
    complete = false;
    await assert.rejects(createIllustration("coffee"), /No usable image/);
  } finally {
    if (oldKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = oldKey;
    if (oldModel === undefined) delete process.env.OMI_MAGAZINE_IMAGE_MODEL;
    else process.env.OMI_MAGAZINE_IMAGE_MODEL = oldModel;
  }
});

test("magazine images persist privately with revision checks, remain through note edits, and clear with a changed transcript", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "meaningful-visuals-"));
  process.env.MEANINGFULMEET_DATA_FILE = path.join(directory, "demo.json");
  const { mutateDatabase, getDatabase } = await import("../src/lib/store");
  const { journalKey, readJournal, saveJournal } =
    await import("../src/features/fieldnotes/server");
  const { saveVisual } = await import("../src/features/fieldnotes/visuals");
  const api =
    await import("../src/app/api/events/[eventId]/meetings/[meetingId]/fieldnotes/images/route");
  const route = {
    params: Promise.resolve({ eventId: "evt_demo", meetingId: "visual" }),
  };
  const request = (viewer = "usr_self", body?: unknown) =>
    new NextRequest(
      "http://localhost/api/events/evt_demo/meetings/visual/fieldnotes/images",
      {
        method: body ? "POST" : "GET",
        headers: {
          cookie: `demo_user=${viewer}`,
          "Content-Type": "application/json",
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      },
    );
  try {
    await mutateDatabase((db) => {
      db.meetings.push({
        id: "visual",
        eventId: "evt_demo",
        matchId: "match",
        ownerUserId: "usr_self",
        candidateId: "usr_01",
        requesterAccepted: true,
        recipientAccepted: true,
        status: "completed",
        createdAt: new Date().toISOString(),
      });
      (db.fieldnotes ??= {})[journalKey("visual", "usr_self")] = {
        ...makeDemoJournal(),
        visuals: [],
      };
    });
    assert.equal((await api.GET(request("usr_02"), route)).status, 404);
    assert.equal((await api.GET(request("usr_01"), route)).status, 409);
    assert.equal(
      (
        await api.POST(
          request("usr_self", {
            action: "generate",
            revision: 1,
            query: "coffee",
            consent: false,
          }),
          route,
        )
      ).status,
      400,
    );
    assert.equal(
      (
        await api.POST(
          request("usr_self", {
            action: "select",
            revision: 1,
            visual: { ...photo, url: "https://bad.example/x.png" },
          }),
          route,
        )
      ).status,
      400,
    );
    const selected = await api.POST(
      request("usr_self", { action: "select", revision: 1, visual: photo }),
      route,
    );
    assert.equal(selected.status, 200);
    assert.match(selected.headers.get("Cache-Control")!, /no-store/);
    const journal = await selected.json();
    assert.deepEqual(journal.visuals, [photo]);
    assert.equal(journal.revision, 2);
    assert.equal(
      (await readJournal("evt_demo", "visual", "usr_01")).journal.visuals,
      undefined,
    );
    await assert.rejects(
      saveVisual("evt_demo", "visual", "usr_self", 1, photo),
      /changed/,
    );
    const saved = await saveJournal("evt_demo", "visual", "usr_self", {
      revision: 2,
      note: "Private reflection",
      transcript: journal.transcript,
      completedFollowups: [],
    });
    assert.deepEqual(saved.visuals, [photo]);
    const changed = await saveJournal("evt_demo", "visual", "usr_self", {
      revision: 3,
      note: "Private reflection",
      transcript: "A new conversation.",
      completedFollowups: [],
    });
    assert.equal(changed.visuals, undefined);
    assert.equal(changed.edition, undefined);
    assert.equal(
      (await getDatabase()).fieldnotes?.[journalKey("visual", "usr_self")].note,
      "Private reflection",
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
