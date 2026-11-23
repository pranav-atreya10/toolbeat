/**
 * What Vercel runs to build the site (the "vercel-build" script).
 *
 * 1. Generate the database code.
 * 2. Update the database tables, but only if DATABASE_URL is set.
 *    Without it, we skip this step with a warning instead of failing,
 *    so the free checker still deploys. The waitlist won't save emails
 *    until DATABASE_URL is added in Vercel.
 * 3. Build the Next.js site.
 */
import { execSync } from "node:child_process";

const run = (cmd) => execSync(cmd, { stdio: "inherit" });

run("prisma generate");

if (process.env.DATABASE_URL) {
  run("prisma migrate deploy");
} else {
  console.warn(
    "\n⚠️  DATABASE_URL is not set, so the database tables were not updated.\n" +
      "   The site will build, but the waitlist can't save emails.\n" +
      "   Add DATABASE_URL in Vercel → Settings → Environment Variables\n" +
      "   (tick Production AND Preview), then redeploy.\n",
  );
}

run("next build");
