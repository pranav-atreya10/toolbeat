/**
 * Checks against real public servers on the internet.
 * These are skipped by default (they need internet and can be flaky).
 * Run them with:  LIVE=1 npm test
 */
import { describe, expect, it } from "vitest";
import { runCheck } from "@/lib/checks";

const live = process.env.LIVE ? describe : describe.skip;

live("real servers (LIVE=1)", () => {
  // Public MCP servers that were working at the time of writing.
  // If one starts failing, check it in a browser before assuming a bug.
  it.each(["https://mcp.deepwiki.com/mcp", "https://docs.mcp.cloudflare.com/mcp", "https://mcp.context7.com/mcp"])(
    "%s passes",
    async (url) => {
      const r = await runCheck(url);
      if (r.verdict === "fail") console.log(JSON.stringify(r, null, 2));
      expect(["pass", "warn", "rate_limited"]).toContain(r.verdict);
    },
    35_000,
  );

  it("a regular website fails at the handshake", async () => {
    const r = await runCheck("https://example.com/");
    expect(r.verdict).toBe("fail");
    expect(r.steps.find((s) => s.id === "handshake")?.status).toBe("fail");
  }, 35_000);

  it("a domain that doesn't exist fails at resolve", async () => {
    const r = await runCheck("https://this-domain-does-not-exist-toolbeat.tech/mcp");
    expect(r.steps[0].code).toBe("DNS_NOT_FOUND");
  }, 35_000);
});
