/**
 * POST /api/waitlist  { "email": "...", "source": "hero" | "result" | "footer" }
 *
 * Saves an email to the waitlist. Signing up twice is fine: we keep the
 * first entry and answer the same way, so nobody can use this form to find
 * out whether someone else signed up.
 */
import { getDb, hasDb } from "@/lib/db";
import { checkWaitlistLimit, clientIp } from "@/lib/rate-limit";
import { addToWaitlist, isValidEmail, normalizeEmail, toSource } from "@/lib/waitlist";

export async function POST(request: Request) {
  let body: { email?: unknown; source?: unknown; company?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Send JSON like { \"email\": \"you@company.com\" }." }, { status: 400 });
  }

  // Bots fill in every field, including this hidden one. People never see it.
  if (typeof body.company === "string" && body.company.length > 0) {
    return Response.json({ ok: true });
  }

  const email = typeof body.email === "string" ? normalizeEmail(body.email) : "";
  if (!isValidEmail(email)) {
    return Response.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const limit = await checkWaitlistLimit(clientIp(request.headers));
  if (!limit.ok) {
    return Response.json(
      { error: "Too many sign-ups from your network. Try again in an hour." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  if (!hasDb()) {
    console.error("Waitlist sign-up failed: DATABASE_URL is not set.");
    return Response.json({ error: "The waitlist is having trouble. Try again later." }, { status: 503 });
  }

  try {
    await addToWaitlist(getDb(), email, toSource(body.source));
  } catch (err) {
    console.error("Waitlist sign-up failed:", err);
    return Response.json({ error: "The waitlist is having trouble. Try again later." }, { status: 500 });
  }

  return Response.json({ ok: true });
}
