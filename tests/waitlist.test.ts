import { describe, expect, it } from "vitest";
import { isValidEmail, normalizeEmail, toCsv, toSource } from "@/lib/waitlist";
import { checkAdmin } from "@/lib/admin-auth";

describe("email clean-up", () => {
  it("trims and lowercases", () => {
    expect(normalizeEmail("  Ana@Company.COM ")).toBe("ana@company.com");
  });
  it.each(["ana@company.com", "a.b+tag@sub.example.co.uk"])("accepts %s", (e) => {
    expect(isValidEmail(e)).toBe(true);
  });
  it.each(["", "ana", "ana@", "@company.com", "ana@company", "ana @company.com", `${"a".repeat(250)}@x.com`])(
    "rejects %s",
    (e) => {
      expect(isValidEmail(e)).toBe(false);
    },
  );
  it("only accepts known sources", () => {
    expect(toSource("result")).toBe("result");
    expect(toSource("evil")).toBeNull();
    expect(toSource(undefined)).toBeNull();
  });
});

describe("CSV export", () => {
  it("writes a header and one row per email", () => {
    const csv = toCsv([{ email: "a@b.co", source: "footer", createdAt: new Date("2026-11-23T00:00:00Z") }]);
    expect(csv).toBe("email,source,joined_at\na@b.co,footer,2026-11-23T00:00:00.000Z\n");
  });
  it("defuses values that a spreadsheet would run as a formula", () => {
    const csv = toCsv([{ email: "=cmd()@x.co", source: null, createdAt: new Date(0) }]);
    expect(csv).toContain("'=cmd()@x.co");
  });
});

describe("admin password check", () => {
  const req = (auth?: string) => new Request("http://x/api/admin/waitlist", { headers: auth ? { authorization: auth } : {} });
  const basic = (pw: string) => `Basic ${Buffer.from(`admin:${pw}`).toString("base64")}`;

  it("is off when no password (or a short one) is set", () => {
    delete process.env.ADMIN_PASSWORD;
    expect(checkAdmin(req(basic("anything")))).toBe("disabled");
    process.env.ADMIN_PASSWORD = "short";
    expect(checkAdmin(req(basic("short")))).toBe("disabled");
  });
  it("checks the password", () => {
    process.env.ADMIN_PASSWORD = "correct-horse-battery";
    expect(checkAdmin(req())).toBe("unauthorized");
    expect(checkAdmin(req(basic("wrong-password-xx")))).toBe("unauthorized");
    expect(checkAdmin(req(basic("correct-horse-battery")))).toBe("ok");
    delete process.env.ADMIN_PASSWORD;
  });
});
