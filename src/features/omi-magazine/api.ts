import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { analyze } from "./analysis";
import {
  editionInputSchema,
  reviewedSchema,
  validateInsights,
  validateSegments,
  type Edition,
} from "./model";
import { syncEdition, readPaths, deleteGraphEdition, withGraph } from "./graph";
import { loadEdition, removeEdition, saveEdition, listEditions } from "./store";

let busy = false;
const headers = { "Cache-Control": "no-store" };
const reply = (body: unknown, status = 200) =>
  Response.json(body, { status, headers });
export function authorized(request: Request) {
  const secret = process.env.OMI_LAB_TOKEN;
  if (!secret) return false;
  const provided =
    request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  return timingSafeEqual(
    createHash("sha256").update(secret).digest(),
    createHash("sha256").update(provided).digest(),
  );
}
export async function GET(request: Request) {
  if (!authorized(request))
    return reply({ error: "Private operator access required." }, 401);
  const url = new URL(request.url),
    id = url.searchParams.get("id");
  if (id) {
    if (!z.uuid().safeParse(id).success)
      return reply({ error: "Invalid edition ID." }, 400);
    try {
      return reply({ edition: await loadEdition(id) });
    } catch {
      return reply({ error: "Edition not found." }, 404);
    }
  }
  return reply({
    falkordb: process.env.FALKORDB_URL
      ? "Configured · not yet verified"
      : "Not configured",
    openai:
      process.env.OPENAI_API_KEY && process.env.OPENAI_MODEL
        ? "Configured · not yet verified"
        : "Not configured",
    trueforge: "Not integrated",
    sharing: "Disabled · operator-only lab",
    editions: await listEditions(),
  });
}
export async function POST(request: Request) {
  if (!authorized(request))
    return reply({ error: "Private operator access required." }, 401);
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin)
    return reply({ error: "Cross-origin request rejected." }, 403);
  if (busy)
    return reply(
      { error: "Another lab operation is running. Try again shortly." },
      409,
    );
  busy = true;
  try {
    // Stream with a byte bound; Content-Length alone is untrusted.
    const reader = request.body?.getReader();
    if (!reader) return reply({ error: "Request body required." }, 400);
    const chunks: Uint8Array[] = [];
    let bytes = 0;
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > 100_000) {
        await reader.cancel();
        return reply({ error: "Request exceeds 100 KB." }, 413);
      }
      chunks.push(chunk.value);
    }
    const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (body.action === "analyze") {
      const input = reviewedSchema.parse(body.input);
      const segments = validateSegments(input.segments);
      return reply(await analyze(input.source, segments));
    }
    if (body.action === "generate") {
      const input = editionInputSchema.parse(body.input);
      validateSegments(input.segments);
      validateInsights(input.insights, input.segments);
      // Drop segments that support no approved insight; they have no place in the saved edition.
      const used = new Set(
        input.insights.flatMap((insight) => insight.evidenceSegmentIds),
      );
      const edition: Edition = {
        ...input,
        segments: input.segments.filter((segment) => used.has(segment.id)),
        id: randomUUID(),
        createdAt: new Date().toISOString(),
        graphStatus: "not-configured",
      };
      // Save first so even a partially completed remote write has a durable deletion/retry handle.
      if (process.env.FALKORDB_URL) edition.graphStatus = "failed";
      await saveEdition(edition);
      if (process.env.FALKORDB_URL) {
        try {
          await syncEdition(edition);
          edition.graphStatus = "synced";
        } catch {
          /* Keep private local edition available with honest failed status. */
        }
        await saveEdition(edition);
      }
      return reply({ edition });
    }
    if (body.action === "check") {
      try {
        await withGraph(async (graph) => {
          const result = await graph.roQuery<{ ok: number }>("RETURN 1 AS ok", {
            TIMEOUT: 3000,
          });
          if (result.data?.[0]?.ok !== 1) throw Error();
        });
        return reply({ falkordb: "LIVE PASSED" });
      } catch {
        return reply(
          {
            error:
              "FalkorDB connection failed; check network and instance access.",
          },
          502,
        );
      }
    }
    if (["paths", "sync", "delete"].includes(body.action)) {
      const id = z.uuid().parse(body.id);
      let edition: Edition;
      try {
        edition = await loadEdition(id);
      } catch {
        return reply({ error: "Edition not found." }, 404);
      }
      if (body.action === "paths") {
        try {
          return reply({ paths: await readPaths(id) });
        } catch {
          return reply(
            {
              error: "Graph read failed; the local edition is still available.",
            },
            502,
          );
        }
      }
      if (body.action === "sync") {
        try {
          await syncEdition(edition);
          edition.graphStatus = "synced";
          await saveEdition(edition);
          return reply({ edition });
        } catch {
          return reply(
            {
              error:
                "Graph synchronization failed. Retry when the instance is reachable.",
            },
            502,
          );
        }
      }
      // A failed remote write could have committed. Always remove remote copies before reporting deletion.
      if (edition.graphStatus !== "not-configured") {
        try {
          await deleteGraphEdition(id);
        } catch {
          return reply(
            {
              error:
                "Remote deletion could not be verified. Nothing is reported deleted; retry when connected.",
            },
            502,
          );
        }
      }
      await removeEdition(id);
      return reply({ deleted: true });
    }
    return reply({ error: "Unknown lab action." }, 400);
  } catch (error) {
    if (error instanceof z.ZodError || error instanceof SyntaxError)
      return reply(
        { error: "Invalid input. Review source text and selected insights." },
        400,
      );
    // Only our analysis errors are safe to expose; do not echo client/provider internals.
    const message = error instanceof Error ? error.message : "";
    return reply(
      {
        error:
          /^(Configure OPENAI|OpenAI request failed|OpenAI response was incomplete|Analysis returned|Insight refers|Quoted words|Segment IDs|Reviewed transcript|Insight IDs)/.test(
            message,
          )
            ? message
            : "The operation failed; no successful provider result is claimed.",
      },
      422,
    );
  } finally {
    busy = false;
  }
}
