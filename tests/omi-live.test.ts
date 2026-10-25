import { test } from "node:test";
import assert from "node:assert/strict";
import {
  readCaptions,
  type Caption,
} from "../src/features/omi-magazine/caption-reader";
import { GET } from "../src/app/api/omi-lab/live/route";

test("caption reader survives split UTF-8/SSE frames and excludes malformed or unfinished evidence", async () => {
  const frames = [
    { type: "partial", text: "Café…" },
    { type: "transcript", is_final: false, text: "Unfinished", event_id: "no" },
    { type: "transcript", text: "Café conversation.", event_id: "final-1" },
    { type: "gap", text: "Missing audio", event_id: "gap-1" },
    { type: "audio", text: "Never relay audio" },
  ];
  const bytes = new TextEncoder().encode(
    frames.map((item) => `data: ${JSON.stringify(item)}\n\n`).join(""),
  );
  const split = bytes.indexOf(0xc3) + 1;
  const received: Caption[] = [];
  await readCaptions(
    new ReadableStream({
      start(c) {
        c.enqueue(bytes.slice(0, split));
        c.enqueue(bytes.slice(split));
        c.close();
      },
    }),
    (item) => received.push(item),
  );
  assert.deepEqual(
    received.map((item) => item.type),
    ["partial", "transcript", "gap"],
  );
  assert.equal(received[0].text, "Café…");
  assert.equal(received[1].event_id, "final-1");
});
test("live operator route requires token and explicit consent, rejects cross-origin access", async () => {
  const oldToken = process.env.OMI_LAB_TOKEN,
    oldBridge = process.env.OMI_BRIDGE_URL;
  process.env.OMI_LAB_TOKEN = "test-live-token";
  delete process.env.OMI_BRIDGE_URL;
  const request = (headers: Record<string, string> = {}) =>
    new Request("http://localhost/api/omi-lab/live", { headers });
  try {
    assert.equal((await GET(request())).status, 401);
    assert.equal(
      (await GET(request({ Authorization: "Bearer test-live-token" }))).status,
      403,
    );
    assert.equal(
      (
        await GET(
          request({
            Authorization: "Bearer test-live-token",
            "X-Omi-Consent": "granted",
            Origin: "https://unrelated.example",
          }),
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await GET(
          request({
            Authorization: "Bearer test-live-token",
            "X-Omi-Consent": "granted",
          }),
        )
      ).status,
      503,
    );
  } finally {
    if (oldToken === undefined) delete process.env.OMI_LAB_TOKEN;
    else process.env.OMI_LAB_TOKEN = oldToken;
    if (oldBridge === undefined) delete process.env.OMI_BRIDGE_URL;
    else process.env.OMI_BRIDGE_URL = oldBridge;
  }
});
