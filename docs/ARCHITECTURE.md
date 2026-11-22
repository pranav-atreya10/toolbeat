# Architecture

## Routes (Next.js App Router)

| Route | What |
|-------|------|
| `/` | Landing page with the free checker + waitlist (match `design/landing-page.dc.html`) |
| `POST /api/check` | Public one-off check. Body `{ url }`. Rate-limited, SSRF-protected. Returns step results. |
| `POST /api/waitlist` | Save an email (validate, dedupe) |
| `/dashboard` | Signed-in list of monitors with current status |
| `/dashboard/monitors/new` | Add a server URL |
| `/dashboard/monitors/[id]` | History, incidents, settings |
| `GET /api/cron/run-checks` | Runs due checks. Protected by `CRON_SECRET`. |
| `/status/[slug]` | Public status page (optional per monitor) |
| `/badge/[slug].svg` | README badge |
| `/bot` | Explains what ToolbeatBot does and how to opt out |

## Scheduling

- Vercel Hobby cron only runs once a day, so for testing use the daily cron or call the route manually.
- Real schedules need either Vercel Pro (cron every minute) or a free external pinger (e.g. a GitHub Actions schedule, or Upstash QStash) that calls `/api/cron/run-checks`.
- The cron route picks monitors where `nextCheckAt <= now`, runs up to ~25 in parallel, and saves the results.

## Database (Prisma, Neon Postgres)

```prisma
model User {
  id        String    @id            // Clerk user id
  email     String
  createdAt DateTime  @default(now())
  monitors  Monitor[]
}

model Monitor {
  id            String    @id @default(cuid())
  userId        String
  user          User      @relation(fields: [userId], references: [id])
  name          String
  url           String
  intervalMin   Int       @default(15)
  status        String    @default("unknown") // up | down | warn | unknown
  failStreak    Int       @default(0)
  nextCheckAt   DateTime  @default(now())
  publicSlug    String?   @unique
  createdAt     DateTime  @default(now())
  checks        Check[]
  incidents     Incident[]
}

model Check {
  id         String   @id @default(cuid())
  monitorId  String
  monitor    Monitor  @relation(fields: [monitorId], references: [id], onDelete: Cascade)
  result     String   // pass | warn | fail
  steps      Json     // [{ name, status, latencyMs, message }]
  createdAt  DateTime @default(now())
  @@index([monitorId, createdAt])
}

model Incident {
  id         String    @id @default(cuid())
  monitorId  String
  monitor    Monitor   @relation(fields: [monitorId], references: [id], onDelete: Cascade)
  startedAt  DateTime  @default(now())
  resolvedAt DateTime?
  reason     String
}

model WaitlistEntry {
  id        String   @id @default(cuid())
  email     String   @unique
  source    String?  // "hero" | "result" | "footer"
  createdAt DateTime @default(now())
}
```

Keep only 30 days of raw `Check` rows (a daily cleanup job).

## Environment variables

`DATABASE_URL`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `RESEND_API_KEY`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `CRON_SECRET`

## Folder layout

```
app/                 routes above
lib/checks/          probe steps, message mapping, SSRF guard
lib/alerts/          state machine (failStreak) + Resend emails
lib/db.ts            Prisma client
components/          UI (shadcn/ui based)
public/brand/        copy SVGs from /brand
```
