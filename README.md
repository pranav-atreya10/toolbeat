# Toolbeat

Monitors remote MCP servers the way AI clients actually connect: a real MCP handshake, not a plain ping.
See `CLAUDE.md` and `docs/` for the full plan.

**Status:** Milestone 1 (free checker) is built. Not deployed yet.

## Run it on your computer

You need [Node.js](https://nodejs.org) 22 or newer.

```bash
npm install
```

```bash
npm run dev
```

Then open http://localhost:3000 and paste an MCP server URL into the checker.

No accounts or keys are needed to run locally. Without Upstash keys, the rate limit is kept in memory
(10 checks per hour per visitor, reset when you restart the server).

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
| `lib/rate-limit.ts` | Limits on the free checker |
| `lib/docs/` | Text for the docs pages |
| `components/` | Pieces of the website (checker card, header, docs sidebar) |
| `tests/` | Automatic tests |
| `docs/`, `design/`, `brand/`, `reference/` | The original handoff files |

## Deploying (Vercel)

1. Import this repo in Vercel.
2. Create a free Upstash Redis database and add `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
   in Vercel's environment variables (see `.env.example`).
3. Add the `toolbeat.tech` domain in the Vercel project settings.
