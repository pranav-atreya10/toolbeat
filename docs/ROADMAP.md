# Roadmap (build in this order)

## Milestone 1: Free checker (the launch)
- Next.js app, Tailwind, Geist, brand assets in `public/brand`
- `lib/checks` with all steps from CHECKS.md, SSRF guard, timeouts
- `POST /api/check` with Upstash rate limiting
- Landing page with the live checker card wired to the real API
- Unit tests for the message mapping and SSRF guard (test against a few known-good and known-broken public servers)
- Deploy to Vercel on toolbeat.tech

## Milestone 2: Waitlist
- Neon + Prisma, `WaitlistEntry`
- Waitlist forms (hero, result card, footer) → `POST /api/waitlist`
- Simple admin page or script to export emails

## Milestone 3: Accounts + monitors
- Clerk sign-in, `User`/`Monitor`/`Check` tables
- Dashboard: add, list and delete monitors; manual "check now"
- Cron route + scheduler (see ARCHITECTURE.md "Scheduling")

## Milestone 4: Alerts
- `failStreak` state machine (2 fails = down, 1 pass = recovered)
- Resend emails for down and recovered, with the plain-English reason and fix hint
- `Incident` records + history view

## Milestone 5: Status page + badge
- `/status/[slug]`, `/badge/[slug].svg`, owner toggle

## Later
- Payments (Stripe). The founder is under 18: a parent/guardian must own the Stripe account, so set this up together before building checkout.
- Logged-in deep checks with a customer-provided test token (read-only tools only)
- Slack alerts, weekly report email, CLI / GitHub Action
- Analytics for server owners (which clients and tools get used)
