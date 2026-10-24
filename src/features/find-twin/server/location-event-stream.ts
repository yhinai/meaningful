import type { NextRequest } from "next/server";
import { authorizeMeeting } from "./authorization";
import { locationErrorResponse, type LocationRouteContext } from "./http";
import { readLocationEvents } from "./rendezvous-service";

export async function locationStreamResponse(
  request: NextRequest,
  route: LocationRouteContext,
) {
  try {
    const { eventId, meetingId } = await route.params;
    await authorizeMeeting(request, eventId, meetingId);
    let sequence = Number(
      request.headers.get("Last-Event-ID") ||
        request.nextUrl.searchParams.get("lastSeq") ||
        0,
    );
    if (!Number.isSafeInteger(sequence) || sequence < 0) sequence = 0;
    let timer: ReturnType<typeof setInterval> | undefined;
    let stopped = false;
    let pending = false;
    let ticks = 0;
    const encoder = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        const close = () => {
          if (stopped) return;
          stopped = true;
          if (timer) clearInterval(timer);
          try {
            controller.close();
          } catch {}
        };
        const send = async () => {
          if (stopped || pending) return;
          pending = true;
          try {
            // Recheck authoritative meeting consent for every batch, not only stream creation.
            const context = await authorizeMeeting(request, eventId, meetingId);
            const batch = await readLocationEvents(context, sequence);
            if (stopped) return;
            for (const event of batch.events) {
              controller.enqueue(
                encoder.encode(
                  `id: ${event.seq}\ndata: ${JSON.stringify(event)}\n\n`,
                ),
              );
              sequence = event.seq;
            }
            if (++ticks % 15 === 0)
              controller.enqueue(encoder.encode(": keepalive\n\n"));
            if (batch.closed) close();
          } catch {
            close();
          } finally {
            pending = false;
          }
        };
        timer = setInterval(() => void send(), 1000);
        void send();
        request.signal.addEventListener("abort", close, { once: true });
        if (request.signal.aborted) close();
      },
      cancel() {
        stopped = true;
        if (timer) clearInterval(timer);
      },
    });
    return new Response(body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "private, no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
        Vary: "Cookie",
      },
    });
  } catch (error) {
    return locationErrorResponse(error);
  }
}
