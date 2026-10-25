import { LocationError } from "@/features/find-twin/server/location-error";

/** Shared caption-only relay. No raw audio, persistence, or historical replay on first connect. */
export function captionResponse(
  request: Request,
  bridgeUrl: string,
  verifyAccess: () => Promise<unknown> = async () => {},
) {
  const url = new URL("/listen-ws", bridgeUrl);
  if (!["http:", "https:", "ws:", "wss:"].includes(url.protocol))
    throw new LocationError("Invalid Omi bridge configuration.", 503);
  url.protocol = ["https:", "wss:"].includes(url.protocol) ? "wss:" : "ws:";
  url.searchParams.set("mode", "captions");
  url.searchParams.set("replay", "0");
  const after = request.headers.get("last-event-id");
  if (after && after.length <= 128 && !/[\r\n]/.test(after))
    url.searchParams.set("after", after);
  let stop = () => {};
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();
      const socket = new WebSocket(url);
      let closed = false;
      let lastId = "";
      const send = (data: Record<string, unknown>, id?: string) => {
        if (closed) return;
        controller.enqueue(
          encoder.encode(
            `${id ? `id: ${id}\n` : ""}data: ${JSON.stringify(data)}\n\n`,
          ),
        );
      };
      const ping = setInterval(() => {
        void verifyAccess()
          .then(() => {
            if (!closed) controller.enqueue(encoder.encode(": keepalive\n\n"));
          })
          .catch(() => {
            send({
              type: "unavailable",
              text: "This meeting is no longer available.",
            });
            stop();
          });
      }, 15000);
      const timeout = setTimeout(() => stop(), 240000);
      stop = () => {
        if (closed) return;
        closed = true;
        clearInterval(ping);
        clearTimeout(timeout);
        request.signal.removeEventListener("abort", stop);
        socket.close();
        try {
          controller.close();
        } catch {
          /* Cancellation already closes the consumer. */
        }
      };
      socket.onmessage = (event) => {
        if (
          closed ||
          typeof event.data !== "string" ||
          event.data.length > 24000
        )
          return;
        try {
          const item = JSON.parse(event.data);
          if (!item || typeof item !== "object") return;
          if (item.type === "status") {
            send({
              type: "status",
              text:
                item.stream_connected === false
                  ? "Omi is reconnecting to transcription."
                  : item.audio_active
                    ? "Audio arriving from Omi."
                    : "Connected. Waiting for Omi audio.",
            });
          } else if (item.type === "replay" && item.reset) {
            send({
              type: "gap",
              event_id: `reconnect-${Date.now()}`,
              text: "Some words are outside the bridge’s replay history.",
            });
          } else if (
            ["transcript", "partial", "gap"].includes(item.type) &&
            typeof item.text === "string" &&
            item.text.length <= 12000
          ) {
            if (item.type === "transcript" && item.is_final === false) return;
            const id =
              typeof item.event_id === "string" &&
              item.event_id.length <= 128 &&
              !/[\r\n]/.test(item.event_id)
                ? item.event_id
                : undefined;
            if (item.type !== "partial" && !id) return;
            if (id) lastId = id;
            send(
              {
                type: item.type,
                text: item.text,
                ...(id ? { event_id: id } : {}),
                ...(typeof item.timestamp === "string"
                  ? { timestamp: item.timestamp.slice(0, 100) }
                  : {}),
                ...(typeof item.utterance_id === "string"
                  ? { utterance_id: item.utterance_id.slice(0, 160) }
                  : {}),
              },
              item.type === "partial" ? undefined : lastId,
            );
          }
        } catch {
          /* A malformed upstream frame must never enter saved evidence. */
        }
      };
      socket.onerror = () => {
        send({
          type: "status",
          text: "The Omi bridge is unavailable. Reconnecting…",
        });
        stop();
      };
      socket.onclose = () => stop();
      request.signal.addEventListener("abort", stop, { once: true });
      if (request.signal.aborted) stop();
    },
    cancel() {
      stop();
    },
  });
  return new Response(body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "private, no-store, no-transform",
      Vary: "Cookie",
      "X-Accel-Buffering": "no",
    },
  });
}
