// Prisma settings. The database address comes from DATABASE_URL in .env (never commit .env).
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Not required for `prisma generate`, only for commands that touch the database.
    url: process.env.DATABASE_URL,
  },
});
