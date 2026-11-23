/**
 * Waitlist logic: clean up an email address and save it once.
 */
import type { PrismaClient } from "@/lib/generated/prisma/client";

export const WAITLIST_SOURCES = ["hero", "result", "footer"] as const;
export type WaitlistSource = (typeof WAITLIST_SOURCES)[number];

/** Trim and lowercase, so "Ana@Company.com " and "ana@company.com" count as the same person. */
export function normalizeEmail(input: string): string {
  return input.trim().toLowerCase();
}

/** A simple, forgiving check. The real test is whether our email later arrives. */
export function isValidEmail(email: string): boolean {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

export function toSource(value: unknown): WaitlistSource | null {
  return WAITLIST_SOURCES.includes(value as WaitlistSource) ? (value as WaitlistSource) : null;
}

/**
 * Save an email. If it's already on the list, keep the original entry
 * (and its original source) and report "already".
 */
export async function addToWaitlist(
  db: PrismaClient,
  email: string,
  source: WaitlistSource | null,
): Promise<"joined" | "already"> {
  try {
    await db.waitlistEntry.create({ data: { email, source } });
    return "joined";
  } catch (err) {
    // P2002 = "unique constraint failed": this email is already saved.
    if ((err as { code?: string }).code === "P2002") return "already";
    throw err;
  }
}

/** Turn waitlist rows into a CSV file (opens in Excel, Numbers or Google Sheets). */
export function toCsv(rows: { email: string; source: string | null; createdAt: Date }[]): string {
  const cell = (v: string) => {
    // Stop spreadsheet apps from treating a value as a formula.
    const safe = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
    return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  const lines = rows.map((r) => [r.email, r.source ?? "", r.createdAt.toISOString()].map(cell).join(","));
  return ["email,source,joined_at", ...lines].join("\n") + "\n";
}
