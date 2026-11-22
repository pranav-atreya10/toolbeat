import { describe, expect, it } from "vitest";
import { isBlockedIp, resolvePublic, BlockedAddressError } from "@/lib/checks/ssrf";
import { runCheck, validateUrl } from "@/lib/checks";

describe("isBlockedIp", () => {
  it.each([
    "127.0.0.1",
    "10.1.2.3",
    "172.16.0.1",
    "172.31.255.255",
    "192.168.1.1",
    "169.254.169.254", // cloud metadata
    "100.64.0.1",
    "0.0.0.0",
    "224.0.0.1",
    "::1",
    "::",
    "fe80::1",
    "fd00::1",
    "::ffff:127.0.0.1",
    "::ffff:a00:1", // 10.0.0.1 in hex form
    "64:ff9b::a00:1",
    "not-an-ip",
  ])("blocks %s", (ip) => {
    expect(isBlockedIp(ip)).toBe(true);
  });

  it.each(["1.1.1.1", "8.8.8.8", "172.32.0.1", "172.15.255.255", "2606:4700:4700::1111", "::ffff:8.8.8.8"])(
    "allows %s",
    (ip) => {
      expect(isBlockedIp(ip)).toBe(false);
    },
  );
});

describe("resolvePublic", () => {
  it("refuses localhost", async () => {
    await expect(resolvePublic("localhost")).rejects.toBeInstanceOf(BlockedAddressError);
  });
  it("refuses a private IP literal", async () => {
    await expect(resolvePublic("[::1]")).rejects.toBeInstanceOf(BlockedAddressError);
  });
});

describe("validateUrl", () => {
  it("accepts a normal https URL", () => {
    expect(validateUrl("https://mcp.example.com/mcp").ok).toBe(true);
  });
  it.each([
    ["not a url", "INVALID_URL"],
    ["ftp://example.com", "INVALID_URL"],
    ["http://example.com/mcp", "NOT_HTTPS"],
    ["https://user:pass@example.com/mcp", "URL_HAS_CREDENTIALS"],
    ["https://example.com:22/mcp", "BLOCKED_PORT"],
  ])("rejects %s", (input, code) => {
    const r = validateUrl(input);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe(code);
  });
});

describe("runCheck refuses private targets", () => {
  it.each(["https://localhost/mcp", "https://127.0.0.1/mcp", "https://169.254.169.254/latest/meta-data", "https://[::1]/mcp"])(
    "%s",
    async (url) => {
      const r = await runCheck(url);
      expect(r.verdict).toBe("fail");
      expect(r.steps[0].code).toBe("BLOCKED_ADDRESS");
      expect(r.steps.slice(1).every((s) => s.status === "skip")).toBe(true);
    },
  );
});
