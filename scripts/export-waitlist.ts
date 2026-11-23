/**
 * Save the waitlist to a CSV file:  npm run waitlist:export
 * Uses DATABASE_URL from your .env file.
 */
import "dotenv/config";
import fs from "node:fs";
import { getDb } from "../lib/db";
import { toCsv } from "../lib/waitlist";

async function main() {
  const db = getDb();
  const rows = await db.waitlistEntry.findMany({
    orderBy: { createdAt: "asc" },
    select: { email: true, source: true, createdAt: true },
  });
  const file = `toolbeat-waitlist-${new Date().toISOString().slice(0, 10)}.csv`;
  fs.writeFileSync(file, toCsv(rows));

  const bySource = rows.reduce<Record<string, number>>((acc, r) => {
    const key = r.source ?? "unknown";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  console.log(`Saved ${rows.length} email${rows.length === 1 ? "" : "s"} to ${file}`);
  for (const [source, n] of Object.entries(bySource)) console.log(`  ${source}: ${n}`);
  await db.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
