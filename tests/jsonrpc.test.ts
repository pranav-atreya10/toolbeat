import { describe, expect, it } from "vitest";
import { parseJsonRpc, looksLikeHtml } from "@/lib/checks/jsonrpc";

describe("parseJsonRpc", () => {
  it("reads plain JSON", () => {
    expect(parseJsonRpc('{"jsonrpc":"2.0","id":1,"result":{"ok":true}}')?.result).toEqual({ ok: true });
  });
  it("reads an SSE stream and skips notifications", () => {
    const sse = [
      'event: message',
      'data: {"jsonrpc":"2.0","method":"notifications/message","params":{}}',
      "",
      "event: message",
      'data: {"jsonrpc":"2.0","id":1,"result":{"protocolVersion":"2025-11-25"}}',
      "",
      "",
    ].join("\n");
    expect(parseJsonRpc(sse)?.result).toEqual({ protocolVersion: "2025-11-25" });
  });
  it("reads errors", () => {
    expect(parseJsonRpc('{"jsonrpc":"2.0","id":1,"error":{"code":-32601,"message":"nope"}}')?.error?.code).toBe(-32601);
  });
  it("returns null for HTML and junk", () => {
    expect(parseJsonRpc("<html></html>")).toBeNull();
    expect(parseJsonRpc('{"status":"ok"}')).toBeNull();
    expect(parseJsonRpc("")).toBeNull();
  });
  it("spots HTML", () => {
    expect(looksLikeHtml("text/html", "")).toBe(true);
    expect(looksLikeHtml("text/plain", "<!DOCTYPE html><html>")).toBe(true);
    expect(looksLikeHtml("application/json", "{}")).toBe(false);
  });
});
