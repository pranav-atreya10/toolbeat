/**
 * Saves real rows. Only runs when TEST_DATABASE_URL points at a throwaway
 * database (never your real one):  TEST_DATABASE_URL=postgresql://... npm test
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/lib/generated/prisma/client";
import { addToWaitlist } from "@/lib/waitlist";

const url = process.env.TEST_DATABASE_URL;
const maybe = url ? describe : describe.skip;

maybe("waitlist database (TEST_DATABASE_URL)", () => {
  let db: PrismaClient;
  beforeAll(async () => {
    db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url! }) });
    await db.waitlistEntry.deleteMany({ where: { email: { endsWith: "@toolbeat-test.dev" } } });
  });
  afterAll(async () => {
    await db.waitlistEntry.deleteMany({ where: { email: { endsWith: "@toolbeat-test.dev" } } });
    await db.$disconnect();
  });

  it("saves an email once, and keeps the first source", async () => {
    expect(await addToWaitlist(db, "ana@toolbeat-test.dev", "footer")).toBe("joined");
    expect(await addToWaitlist(db, "ana@toolbeat-test.dev", "result")).toBe("already");
    const rows = await db.waitlistEntry.findMany({ where: { email: "ana@toolbeat-test.dev" } });
    expect(rows).toHaveLength(1);
    expect(rows[0].source).toBe("footer");
  });
});
