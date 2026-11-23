/**
 * The one shared database client for the whole app.
 *
 * In development, Next.js reloads files often; keeping the client on
 * `globalThis` stops it from opening a new set of connections each time.
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/lib/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Add it to .env (see .env.example).");
  }
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

/** Get the database client (created on first use). */
export function getDb(): PrismaClient {
  globalForPrisma.prisma ??= createClient();
  return globalForPrisma.prisma;
}

/** True when a database is configured. */
export function hasDb() {
  return !!process.env.DATABASE_URL;
}
