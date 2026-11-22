/**
 * Reading JSON-RPC replies.
 *
 * MCP servers answer either with plain JSON, or with Server-Sent Events
 * (SSE): lines like `data: {...}`. For SSE we take the first message that
 * has a `result` or an `error`.
 */

export interface JsonRpcError {
  code: number;
  message: string;
  data?: unknown;
}

export interface JsonRpcReply {
  jsonrpc?: string;
  id?: string | number | null;
  result?: Record<string, unknown>;
  error?: JsonRpcError;
}

function isReply(v: unknown): v is JsonRpcReply {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  const hasResult = "result" in o && typeof o.result === "object" && o.result !== null;
  const hasError =
    "error" in o &&
    typeof o.error === "object" &&
    o.error !== null &&
    typeof (o.error as Record<string, unknown>).code === "number";
  return hasResult || hasError;
}

/** Parse every SSE event's data into JSON values. */
function parseSse(text: string): unknown[] {
  const out: unknown[] = [];
  // Events are separated by a blank line. Each can have several data: lines.
  for (const block of text.split(/\r?\n\r?\n/)) {
    const data = block
      .split(/\r?\n/)
      .filter((l) => l.startsWith("data:"))
      .map((l) => l.slice(5).replace(/^ /, ""))
      .join("\n");
    if (!data) continue;
    try {
      out.push(JSON.parse(data));
    } catch {
      // Not JSON (or cut off). Skip it.
    }
  }
  return out;
}

/**
 * Find the JSON-RPC reply in a response body.
 * Returns null if the body isn't a JSON-RPC reply at all.
 */
export function parseJsonRpc(text: string): JsonRpcReply | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      const v = JSON.parse(trimmed);
      // Batches are rare, but take the first reply if we get one.
      const items = Array.isArray(v) ? v : [v];
      return (items.find(isReply) as JsonRpcReply | undefined) ?? null;
    } catch {
      // Fall through and try SSE, in case of odd formatting.
    }
  }
  return (parseSse(text).find(isReply) as JsonRpcReply | undefined) ?? null;
}

/** True once an SSE body contains a complete reply, so we can stop reading. */
export function hasCompleteReply(text: string): boolean {
  return /\r?\n\r?\n/.test(text) && parseJsonRpc(text) !== null;
}

/** Does this look like a web page rather than an API response? */
export function looksLikeHtml(contentType: string, text: string): boolean {
  if (contentType.includes("html")) return true;
  const start = text.trimStart().slice(0, 200).toLowerCase();
  return start.startsWith("<!doctype html") || start.startsWith("<html") || start.startsWith("<head");
}
