/**
 * POST + server-sent events (EventSource only supports GET).
 * Calls onEvent for every `event:`/`data:` block; resolves when the stream ends.
 */
export class SseError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
  }
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function postSse(
  path: string,
  body: unknown,
  onEvent: (event: string, data: unknown) => void,
  signal?: AbortSignal
): Promise<void> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
      body: JSON.stringify(body),
      signal,
    });
  } catch (err) {
    if ((err as Error).name === "AbortError") throw err;
    throw new SseError("Sunucuya ulaşılamıyor. Backend çalışıyor mu?");
  }

  if (!res.ok || !res.body) {
    let detail = "";
    try {
      const json = await res.json();
      detail = typeof json?.detail === "string" ? json.detail : "";
    } catch {
      /* not JSON */
    }
    if (res.status === 429) detail ||= "Çok fazla istek gönderildi. Biraz bekleyin.";
    if (res.status === 422) detail ||= "Form bilgileri geçersiz.";
    throw new SseError(detail || `Sunucu hatası (${res.status}).`, res.status);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");
    let boundary = buffer.indexOf("\n\n");
    while (boundary !== -1) {
      const block = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      let event = "message";
      const data: string[] = [];
      for (const line of block.split("\n")) {
        if (line.startsWith("event:")) event = line.slice(6).trim();
        else if (line.startsWith("data:")) data.push(line.slice(5).trimStart());
      }
      if (data.length) {
        try {
          onEvent(event, JSON.parse(data.join("\n")));
        } catch {
          onEvent(event, data.join("\n"));
        }
      }
      boundary = buffer.indexOf("\n\n");
    }
  }
}
