import { authorized } from "@/features/omi-magazine/api";
import { captionResponse } from "@/features/fieldnotes/caption-relay";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;
const headers = { "Cache-Control": "private, no-store" };
export async function GET(request: Request) {
  if (!authorized(request))
    return Response.json(
      { error: "Private operator access required." },
      { status: 401, headers },
    );
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin)
    return Response.json(
      { error: "Cross-origin request rejected." },
      { status: 403, headers },
    );
  if (request.headers.get("x-omi-consent") !== "granted")
    return Response.json(
      { error: "Explicit caption consent is required." },
      { status: 403, headers },
    );
  if (!process.env.OMI_BRIDGE_URL)
    return Response.json(
      { error: "Omi bridge is not configured." },
      { status: 503, headers },
    );
  try {
    return captionResponse(request, process.env.OMI_BRIDGE_URL, async () => {
      if (!authorized(request)) throw Error("Operator access revoked.");
    });
  } catch {
    return Response.json(
      { error: "Invalid Omi bridge configuration." },
      { status: 503, headers },
    );
  }
}
