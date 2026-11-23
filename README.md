# Toolbeat

Monitors remote MCP servers the way AI clients actually connect: a real MCP handshake, not a plain ping.
See `CLAUDE.md` and `docs/` for the full plan.

**Status:** Milestones 1 (free checker) and 2 (waitlist) are built. Not deployed yet.

## Run it on your computer

You need [Node.js](https://nodejs.org) 22 or newer.

```bash
npm install
```

```bash
npm run dev
```

Then open http://localhost:3000 and paste an MCP server URL into the checker.

The checker works without any accounts or keys. Without Upstash keys, the rate limit is kept in memory
(10 checks per hour per visitor, reset when you restart the server).

The waitlist needs a database. To set it up:

1. Make a free project at [neon.tech](https://neon.tech) and copy its connection string (Connect button).
2. Copy `.env.example` to a new file called `.env`, and paste the string after `DATABASE_URL=`.
3. Create the waitlist table:

```bash
npx prisma migrate deploy
```

## See who joined the waitlist

Three ways, pick whichever is easiest:

- **In the browser:** set `ADMIN_PASSWORD` (12+ characters) in `.env` or in Vercel, then open
  `/api/admin/waitlist`. Type anything as the username and your password. A spreadsheet file downloads.
- **In the terminal:** `npm run waitlist:export` saves a `.csv` file in this folder.
- **In Neon:** open your project → Tables → `WaitlistEntry`.

## Check a server from the terminal

```bash
npx tsx scripts/check.ts https://mcp.deepwiki.com/mcp
```

## Tests

```bash
npm test
```

This runs the check engine against fake MCP servers on your computer (healthy, broken, sign-in, old spec, new spec).
To also check a few real servers on the internet:

```bash
LIVE=1 npm test
```

## Where things are

| Folder | What's in it |
| --- | --- |
| `app/` | Pages and API routes (`/`, `/docs/...`, `/bot`, `/api/check`) |
| `lib/checks/` | The check engine: the six steps, safety guard, plain-English messages |
| `lib/rate-limit.ts` | Limits on the free checker and waitlist |
| `lib/waitlist.ts`, `lib/db.ts` | Saving waitlist emails |
| `prisma/` | The database layout (`schema.prisma`) and its change history (`migrations/`) |
| `lib/docs/` | Text for the docs pages |
| `components/` | Pieces of the website (checker card, header, docs sidebar) |
| `tests/` | Automatic tests |
| `docs/`, `design/`, `brand/`, `reference/` | The original handoff files |

## Deploying (Vercel)

1. Import this repo in Vercel.
2. In Vercel's environment variables, add `DATABASE_URL` (Neon), `ADMIN_PASSWORD`, and the two Upstash keys
   (`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`) from a free Upstash Redis database. See `.env.example`.
   Each deploy updates the database tables automatically (the `vercel-build` script).
3. Add the `toolbeat.tech` domain in the Vercel project settings.
