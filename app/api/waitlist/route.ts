/**
 * POST /api/waitlist  { "email": "...", "source": "hero" | "result" | "footer" }
 *
 * Placeholder until Milestone 2 (Neon + Prisma). It validates the email but
 * doesn't save it yet, and says so honestly instead of pretending.
 */
export async function POST(request: Request) {
  let email: unknown;
  try {
    ({ email } = (await request.json()) as { email?: unknown });
  } catch {
    return Response.json({ error: "Send JSON like { \"email\": \"you@company.com\" }." }, { status: 400 });
  }
  if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return Response.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  return Response.json(
    { error: "The waitlist opens in a few days. Check back soon." },
    { status: 503 },
  );
}
