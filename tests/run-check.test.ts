import { afterEach, describe, expect, it } from "vitest";
import { runCheck } from "@/lib/checks";
import { startMockServer, type MockMode, type MockServer } from "./mock-mcp-server";

// Tests talk to a local fake server, so allow localhost + http here ONLY.
const TEST_OPTS = { allowPrivateAddresses: true, allowHttp: true, requestTimeoutMs: 1_500, totalTimeoutMs: 6_000 };

let server: MockServer | null = null;
afterEach(async () => {
  await server?.close();
  server = null;
});

async function check(mode: MockMode) {
  server = await startMockServer(mode);
  const result = await runCheck(server.url, TEST_OPTS);
  const byId = Object.fromEntries(result.steps.map((s) => [s.id, s]));
  return { result, byId, calls: server.calls };
}

describe("healthy servers", () => {
  it("current spec (2026-07-28): discovers, lists tools, passes", async () => {
    const { result, byId, calls } = await check("modern");
    expect(result.verdict).toBe("pass");
    expect(result.protocol).toEqual({ era: "modern", version: "2026-07-28" });
    expect(result.server?.name).toBe("mock-modern");
    expect(result.toolCount).toBe(2);
    expect(byId.handshake.code).toBe("HANDSHAKE_OK_MODERN");
    expect(byId.tools.status).toBe("pass");
    expect(byId.quality.status).toBe("pass");
    // Sent the routing headers the new spec requires
    const discover = calls.find((c) => c.rpcMethod === "server/discover")!;
    expect(discover.headers["mcp-method"]).toBe("server/discover");
    expect(discover.headers["user-agent"]).toBe("ToolbeatBot/0.1 (+https://toolbeat.tech/bot)");
    // Never sent initialize to a modern server
    expect(calls.some((c) => c.rpcMethod === "initialize")).toBe(false);
  });

  it("previous spec (2025-11-25): falls back to initialize, keeps the session", async () => {
    const { result, byId, calls } = await check("legacy");
    expect(result.verdict).toBe("pass");
    expect(result.protocol).toEqual({ era: "legacy", version: "2025-11-25" });
    expect(byId.handshake.code).toBe("HANDSHAKE_OK_LEGACY");
    expect(byId.tools.status).toBe("pass");
    expect(calls.map((c) => c.rpcMethod)).toEqual(["server/discover", "initialize", "notifications/initialized", "tools/list"]);
  });

  it("reads SSE-formatted replies", async () => {
    const { result } = await check("legacy-sse-reply");
    expect(result.verdict).toBe("pass");
  });

  it("dual-era servers stay on the current spec", async () => {
    const { result } = await check("dual");
    expect(result.protocol?.era).toBe("modern");
    expect(result.verdict).toBe("pass");
  });

  it("servers without tools pass and skip the tool list", async () => {
    const { result, byId } = await check("no-tools-capability");
    expect(result.verdict).toBe("pass");
    expect(byId.tools.status).toBe("skip");
  });

  it("sign-in servers pass when the OAuth details are right", async () => {
    const { result, byId } = await check("auth-good");
    expect(result.verdict).toBe("pass");
    expect(byId.handshake.code).toBe("HANDSHAKE_AUTH_REQUIRED");
    expect(byId.auth.status).toBe("pass");
    expect(byId.tools.status).toBe("skip");
  });
});

describe("broken servers", () => {
  it.each([
    ["html", "handshake", "HTML_RESPONSE"],
    ["404", "handshake", "NOT_FOUND_404"],
    ["500", "handshake", "SERVER_ERROR_5XX"],
    ["530", "handshake", "CLOUDFLARE_530"],
    ["firewall", "handshake", "FIREWALL_BLOCKED"],
    ["hang", "handshake", "HANDSHAKE_TIMEOUT"],
    ["auth-no-header", "auth", "AUTH_NO_WWW_AUTHENTICATE"],
    ["auth-no-metadata", "auth", "AUTH_NO_METADATA"],
    ["bad-schema", "tools", "TOOLS_INVALID_SCHEMA"],
  ] as const)("%s -> %s fails with %s", async (mode, step, code) => {
    const { result, byId } = await check(mode);
    expect(result.verdict).toBe("fail");
    expect(byId[step].status).toBe("fail");
    expect(byId[step].code).toBe(code);
    expect(byId[step].hint).toBeTruthy();
  });

  it("stops early: steps after a failed handshake are skipped", async () => {
    const { byId } = await check("html");
    expect(byId.auth.status).toBe("skip");
    expect(byId.tools.status).toBe("skip");
    expect(byId.tools.message).toBe("Needs a working handshake first.");
  });

  it("connection refused fails at the connect step", async () => {
    const r = await runCheck("http://127.0.0.1:1/mcp", TEST_OPTS);
    expect(r.verdict).toBe("fail");
    expect(r.steps[1].code).toBe("CONNECT_REFUSED");
  });
});

describe("warnings and special cases", () => {
  it("missing tool descriptions are a warning, not a failure", async () => {
    const { result, byId } = await check("no-descriptions");
    expect(result.verdict).toBe("warn");
    expect(byId.quality.code).toBe("QUALITY_MISSING_DESCRIPTIONS");
    expect(byId.quality.message).toContain('"a"');
  });

  it("deprecated SSE-only servers get a warning", async () => {
    const { result, byId } = await check("sse-only");
    expect(result.verdict).toBe("warn");
    expect(byId.handshake.code).toBe("SSE_DEPRECATED");
    expect(result.protocol?.era).toBe("sse");
  });

  it("429 is 'rate limited', not a failure", async () => {
    const { result } = await check("429");
    expect(result.verdict).toBe("rate_limited");
  });
});

describe("safety", () => {
  it.each(["modern", "legacy", "bad-schema"] as const)("never calls tools on a %s server", async (mode) => {
    const { calls } = await check(mode);
    const allowed = ["server/discover", "initialize", "notifications/initialized", "tools/list", undefined];
    for (const c of calls) expect(allowed).toContain(c.rpcMethod);
  });
});
