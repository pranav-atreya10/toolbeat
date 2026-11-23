/**
 * GET /api/admin/waitlist
 *
 * Downloads the waitlist as a CSV file. Your browser asks for a password:
 * type anything as the username and your ADMIN_PASSWORD as the password.
 */
import { connection } from "next/server";
import { checkAdmin, unauthorizedResponse } from "@/lib/admin-auth";
import { getDb, hasDb } from "@/lib/db";
import { toCsv } from "@/lib/waitlist";

export async function GET(request: Request) {
  // Always run on each request. Without this, Next.js could save one answer
  // at build time and serve it forever.
  await connection();
  const auth = checkAdmin(request);
  if (auth === "disabled") {
    return new Response("Not found.", { status: 404 });
  }
  if (auth === "unauthorized") return unauthorizedResponse();
  if (!hasDb()) return new Response("DATABASE_URL is not set.", { status: 503 });

  const rows = await getDb().waitlistEntry.findMany({
    orderBy: { createdAt: "asc" },
    select: { email: true, source: true, createdAt: true },
  });
  const day = new Date().toISOString().slice(0, 10);
  return new Response(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="toolbeat-waitlist-${day}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
