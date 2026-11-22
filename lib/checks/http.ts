/**
 * The small HTTP client every check request goes through.
 *
 * - Uses the SSRF-safe DNS lookup on every connection.
 * - Always sends the ToolbeatBot User-Agent.
 * - Stops reading big bodies early (we only need the start).
 * - Turns network errors into short codes like "ECONNREFUSED" or "TIMEOUT".
 */
import { Agent, fetch } from "undici";
import { makeSafeLookup } from "./ssrf";
import { MAX_BODY_BYTES, USER_AGENT } from "./constants";

export interface HttpResponse {
  status: number;
  headers: Headers;
  contentType: string;
  /** The (possibly cut-short) response body as text. */
  text: string;
  /** Final URL after redirects. */
  url: string;
  redirected: boolean;
  ms: number;
}

export class NetworkError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export interface HttpClient {
  request(
    url: string,
    init: {
      method?: "GET" | "POST";
      headers?: Record<string, string>;
      body?: string;
      signal: AbortSignal;
      /** Stop reading once this returns true for the text so far. */
      stopWhen?: (textSoFar: string) => boolean;
    },
  ): Promise<HttpResponse>;
  close(): Promise<void>;
}

export function createHttpClient({
  allowPrivate = false,
  connectTimeoutMs = 12_000,
} = {}): HttpClient {
  const dispatcher = new Agent({
    connect: { lookup: makeSafeLookup({ allowPrivate }), timeout: connectTimeoutMs },
    // Don't keep connections around between checks.
    keepAliveTimeout: 1_000,
  });

  return {
    async request(url, { method = "GET", headers = {}, body, signal, stopWhen }) {
      const started = performance.now();
      let res;
      try {
        res = await fetch(url, {
          method,
          body,
          signal,
          redirect: "follow",
          dispatcher,
          headers: { "User-Agent": USER_AGENT, ...headers },
        });
      } catch (err) {
        throw toNetworkError(err);
      }

      let text = "";
      try {
        text = await readCapped(res.body as ReadableStream<Uint8Array> | null, stopWhen);
      } catch (err) {
        // We got headers but the body broke or timed out. Keep what we have,
        // unless we have nothing at all and it was a timeout.
        const ne = toNetworkError(err);
        if (!text && ne.code === "TIMEOUT") throw ne;
      }

      return {
        status: res.status,
        headers: res.headers as unknown as Headers,
        contentType: (res.headers.get("content-type") || "").split(";")[0].trim().toLowerCase(),
        text,
        url: res.url || url,
        redirected: res.redirected,
        ms: Math.round(performance.now() - started),
      };
    },
    async close() {
      await dispatcher.close().catch(() => {});
    },
  };
}

async function readCapped(
  body: ReadableStream<Uint8Array> | null,
  stopWhen?: (text: string) => boolean,
): Promise<string> {
  if (!body) return "";
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let text = "";
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      text += decoder.decode(value, { stream: true });
      if (bytes >= MAX_BODY_BYTES) break;
      if (stopWhen?.(text)) break;
    }
  } finally {
    // Close the stream so long-lived (SSE) responses don't hang around.
    reader.cancel().catch(() => {});
  }
  return text.slice(0, MAX_BODY_BYTES);
}

/** Find the most useful error code inside a fetch error. */
export function toNetworkError(err: unknown): NetworkError {
  if (err instanceof NetworkError) return err;
  const e = err as { name?: string; code?: string; message?: string; cause?: unknown };
  if (e?.name === "AbortError" || e?.name === "TimeoutError") {
    return new NetworkError("TIMEOUT", "The request timed out");
  }
  // undici wraps the real error in `cause`, sometimes several layers deep.
  let cur: unknown = err;
  for (let i = 0; i < 5 && cur; i++) {
    const c = cur as { code?: string; message?: string; cause?: unknown; name?: string };
    if (c.name === "AbortError" || c.name === "TimeoutError") {
      return new NetworkError("TIMEOUT", "The request timed out");
    }
    if (typeof c.code === "string" && c.code !== "ERR_INVALID_STATE") {
      const code = c.code === "UND_ERR_CONNECT_TIMEOUT" ? "TIMEOUT" : c.code;
      return new NetworkError(code, c.message || code);
    }
    cur = c.cause;
  }
  return new NetworkError("NETWORK_ERROR", e?.message || "Network error");
}
