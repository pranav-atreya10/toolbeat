import { describe as group, expect, it } from "vitest";
import { MESSAGES, describe, type MessageCode } from "@/lib/checks/messages";
import { codeForHttpStatus, codeForNetworkError } from "@/lib/checks/messages";

group("message table", () => {
  const codes = Object.keys(MESSAGES) as MessageCode[];

  it.each(codes)("%s has a sentence-case message ending in a full stop", (code) => {
    const { message } = describe(code, { status: 500, host: "x.com", count: 2, names: ["a", "b"], days: 3, url: "https://x" });
    expect(message.length).toBeGreaterThan(5);
    expect(message[0]).toBe(message[0].toUpperCase());
    expect(message.trim().endsWith(".")).toBe(true);
  });

  it.each(codes.filter((c) => MESSAGES[c].severity === "fail" || MESSAGES[c].severity === "warn"))(
    "%s explains how to fix it",
    (code) => {
      expect(describe(code).hint?.length ?? 0).toBeGreaterThan(10);
    },
  );

  it("never apologizes", () => {
    for (const code of codes) {
      const d = describe(code);
      expect(`${d.message} ${d.hint ?? ""}`).not.toMatch(/sorry|unfortunately|oops/i);
    }
  });

  it("matches the examples in CHECKS.md", () => {
    expect(describe("DNS_NOT_FOUND").message).toBe("The domain doesn't resolve, so nothing can connect.");
    expect(describe("NOT_FOUND_404").hint).toContain("usually /mcp");
    expect(describe("HTML_RESPONSE").message).toBe("Got a regular web page instead of an MCP response.");
    expect(describe("CLOUDFLARE_530").message).toBe("Cloudflare can't reach your server.");
    expect(describe("AUTH_NO_WWW_AUTHENTICATE").hint).toBe(
      "Add a WWW-Authenticate header pointing to your protected resource metadata.",
    );
  });
});

group("error code mapping", () => {
  it.each([
    ["ENOTFOUND", "resolve", "DNS_NOT_FOUND"],
    ["ECONNREFUSED", "connect", "CONNECT_REFUSED"],
    ["CERT_HAS_EXPIRED", "connect", "TLS_EXPIRED"],
    ["ERR_TLS_CERT_ALTNAME_INVALID", "connect", "TLS_NAME_MISMATCH"],
    ["DEPTH_ZERO_SELF_SIGNED_CERT", "connect", "TLS_SELF_SIGNED"],
    ["TIMEOUT", "connect", "CONNECT_TIMEOUT"],
    ["TIMEOUT", "handshake", "HANDSHAKE_TIMEOUT"],
    ["ECONNRESET", "handshake", "HANDSHAKE_NETWORK"],
  ] as const)("%s during %s -> %s", (err, phase, code) => {
    expect(codeForNetworkError(err, phase)).toBe(code);
  });

  it.each([
    [404, "NOT_FOUND_404"],
    [405, "METHOD_NOT_ALLOWED_405"],
    [410, "GONE_410"],
    [500, "SERVER_ERROR_5XX"],
    [502, "SERVER_ERROR_5XX"],
    [522, "CLOUDFLARE_52X"],
    [530, "CLOUDFLARE_530"],
    [200, null],
  ] as const)("HTTP %s -> %s", (status, code) => {
    expect(codeForHttpStatus(status)).toBe(code);
  });
});
