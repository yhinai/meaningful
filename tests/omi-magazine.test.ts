import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  fixtureText,
  parseTranscript,
  validateInsights,
  demoInsights,
} from "../src/features/omi-magazine/model";
import { GET, POST } from "../src/features/omi-magazine/api";
import { analyze } from "../src/features/omi-magazine/analysis";

const segments = parseTranscript(fixtureText);
test("Omi import excludes partial and gap events and rejects malformed or ambiguous sources", () => {
  assert.deepEqual(
    parseTranscript(
      [
        JSON.stringify({ event_id: "p", type: "partial", text: "unfinished" }),
        JSON.stringify({ event_id: "g", type: "gap", text: "missing" }),
        JSON.stringify({
          event_id: "f",
          type: "transcript",
          text: "Final words.",
        }),
      ].join("\n"),
    ),
    [{ id: "f", text: "Final words." }],
  );
  assert.throws(() => parseTranscript("{bad json}"));
  assert.throws(() =>
    parseTranscript(
      Array(2)
        .fill(JSON.stringify({ event_id: "same", type: "final", text: "text" }))
        .join("\n"),
    ),
  );
  assert.throws(() => parseTranscript("a".repeat(60_001)));
});
test("evidence validation rejects invented sources and altered quotes", () => {
  const insights = demoInsights(segments);
  assert.equal(validateInsights(insights, segments).length, 3);
  assert.throws(() =>
    validateInsights(
      [{ ...insights[0], evidenceSegmentIds: ["absent"] }],
      segments,
    ),
  );
  assert.throws(() =>
    validateInsights(
      [{ ...insights[0], quote: "words that were never spoken" }],
      segments,
    ),
  );
});
test("operator API rejects demo-user impersonation, cross-origin writes and missing approval", async () => {
  const previous = process.env.OMI_LAB_TOKEN;
  process.env.OMI_LAB_TOKEN = "test-operator-token";
  const request = (body: unknown, headers: Record<string, string> = {}) =>
    new Request("http://localhost/api/omi-lab", {
      method: "POST",
      headers: {
        Authorization: "Bearer test-operator-token",
        "Content-Type": "application/json",
        ...headers,
      },
      body: JSON.stringify(body),
    });
  try {
    assert.equal(
      (
        await GET(
          new Request("http://localhost/api/omi-lab", {
            headers: { Cookie: "demo_user=usr_self" },
          }),
        )
      ).status,
      401,
    );
    assert.equal(
      (
        await POST(
          request({ action: "analyze" }, { Origin: "https://other.example" }),
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await POST(
          request({
            action: "analyze",
            input: { source: "synthetic", segments, analysisConsent: false },
          }),
        )
      ).status,
      400,
    );
    assert.equal(
      (
        await POST(
          request({
            action: "generate",
            input: {
              source: "synthetic",
              segments,
              analysisConsent: true,
              insights: demoInsights(segments),
            },
          }),
        )
      ).status,
      400,
    );
    assert.equal(
      (await POST(request({ action: "paths", id: "../.env" }))).status,
      400,
    );
    assert.equal(
      (await POST(request({ action: "analyze", input: "x".repeat(100_001) })))
        .status,
      413,
    );
    assert.equal(
      (
        await POST(
          request({
            action: "analyze",
            input: { source: "synthetic", segments, analysisConsent: true },
          }),
        )
      ).status,
      200,
    );
  } finally {
    if (previous === undefined) delete process.env.OMI_LAB_TOKEN;
    else process.env.OMI_LAB_TOKEN = previous;
  }
});
test("private edition retains only approved evidence and can be loaded and deleted", async () => {
  const cwd = process.cwd(),
    directory = await mkdtemp(path.join(os.tmpdir(), "omi-edition-"));
  const token = process.env.OMI_LAB_TOKEN,
    url = process.env.FALKORDB_URL;
  process.env.OMI_LAB_TOKEN = "test";
  delete process.env.FALKORDB_URL;
  process.chdir(directory);
  const request = (body: unknown) =>
    new Request("http://localhost/api/omi-lab", {
      method: "POST",
      headers: { Authorization: "Bearer test" },
      body: JSON.stringify(body),
    });
  try {
    const response = await POST(
      request({
        action: "generate",
        input: {
          source: "synthetic",
          segments,
          analysisConsent: true,
          approval: true,
          insights: demoInsights(segments).slice(0, 1),
        },
      }),
    );
    assert.equal(response.status, 200);
    const { edition } = await response.json();
    assert.equal(edition.segments.length, 1);
    assert.equal(edition.graphStatus, "not-configured");
    const loaded = await GET(
      new Request(`http://localhost/api/omi-lab?id=${edition.id}`, {
        headers: { Authorization: "Bearer test" },
      }),
    );
    assert.equal(loaded.status, 200);
    assert.equal(
      (await POST(request({ action: "delete", id: edition.id }))).status,
      200,
    );
    assert.equal(
      (
        await GET(
          new Request(`http://localhost/api/omi-lab?id=${edition.id}`, {
            headers: { Authorization: "Bearer test" },
          }),
        )
      ).status,
      404,
    );
  } finally {
    process.chdir(cwd);
    await rm(directory, { recursive: true, force: true });
    if (token === undefined) delete process.env.OMI_LAB_TOKEN;
    else process.env.OMI_LAB_TOKEN = token;
    if (url !== undefined) process.env.FALKORDB_URL = url;
  }
});
test("real analysis executes approved-segment tool and validates structured output (mock provider)", async () => {
  const originalFetch = globalThis.fetch,
    key = process.env.OPENAI_API_KEY,
    model = process.env.OPENAI_MODEL;
  process.env.OPENAI_API_KEY = "test-only";
  process.env.OPENAI_MODEL = "test-model";
  let calls = 0;
  globalThis.fetch = async (_url, options) => {
    const body = JSON.parse(String(options?.body));
    calls++;
    assert.equal(body.store, false);
    if (calls === 1) {
      assert.equal(body.tool_choice.name, "getApprovedTranscriptSegments");
      return Response.json({
        status: "completed",
        output: [
          {
            type: "function_call",
            name: "getApprovedTranscriptSegments",
            call_id: "call-1",
            arguments: "{}",
          },
        ],
      });
    }
    assert.equal(body.input.at(-1).type, "function_call_output");
    assert.deepEqual(JSON.parse(body.input.at(-1).output), segments);
    return Response.json({
      status: "completed",
      output: [
        {
          type: "message",
          content: [
            {
              type: "output_text",
              text: JSON.stringify({ insights: demoInsights(segments) }),
            },
          ],
        },
      ],
    });
  };
  try {
    const result = await analyze("omi-import", segments);
    assert.equal(calls, 2);
    assert.equal(result.insights.length, 3);
  } finally {
    globalThis.fetch = originalFetch;
    if (key === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = key;
    if (model === undefined) delete process.env.OPENAI_MODEL;
    else process.env.OPENAI_MODEL = model;
  }
});
