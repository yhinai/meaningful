export type Caption = {
  type: "transcript" | "partial" | "gap" | "status";
  text: string;
  event_id?: string;
  timestamp?: string;
};
export async function readCaptions(
  stream: ReadableStream<Uint8Array>,
  onCaption: (caption: Caption) => void,
) {
  const reader = stream.getReader(),
    decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      buffer = buffer.replace(/\r\n/g, "\n");
      if (buffer.length > 100_000)
        throw Error("Caption frame exceeded its limit.");
      let split;
      while ((split = buffer.indexOf("\n\n")) !== -1) {
        const frame = buffer.slice(0, split);
        buffer = buffer.slice(split + 2);
        const data = frame
          .split("\n")
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5).trimStart())
          .join("\n");
        if (!data) continue;
        let item;
        try {
          item = JSON.parse(data);
        } catch {
          continue;
        }
        if (
          !item ||
          !["transcript", "partial", "gap", "status"].includes(item.type) ||
          typeof item.text !== "string" ||
          item.text.length > 12000
        )
          continue;
        if (item.type === "transcript" && item.is_final === false) continue;
        if (
          ["transcript", "gap"].includes(item.type) &&
          (typeof item.event_id !== "string" || item.event_id.length > 128)
        )
          continue;
        onCaption({
          type: item.type,
          text: item.text,
          ...(typeof item.event_id === "string"
            ? { event_id: item.event_id }
            : {}),
          ...(typeof item.timestamp === "string"
            ? { timestamp: item.timestamp.slice(0, 100) }
            : {}),
        });
      }
    }
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
