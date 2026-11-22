# Toolbeat

Toolbeat monitors remote MCP (Model Context Protocol) servers. It checks them the way AI clients actually connect (a real MCP handshake), not with a plain HTTP ping, and alerts the owner when something breaks.

Domain: toolbeat.tech

Start by reading these, in order:
1. `docs/PRODUCT.md`: what we're building and for whom
2. `docs/CHECKS.md`: the exact check logic (this is the core of the product)
3. `docs/ARCHITECTURE.md`: stack, routes, database schema
4. `docs/DESIGN.md`: visual style, fonts, colors, motion
5. `docs/ROADMAP.md`: build order. Work milestone by milestone.
6. `docs/RESEARCH.md`: background (scan results, competitors, customer feedback)

## Stack

- Next.js (App Router) + TypeScript, deployed on Vercel
- Tailwind CSS + shadcn/ui
- Neon Postgres + Prisma
- Clerk for auth (dashboard login)
- Resend for alert emails
- Upstash Redis for rate limiting
- Official MCP TypeScript SDK (`@modelcontextprotocol/sdk`) where it helps; raw `fetch` is fine for the probe
- Stripe later (not in the first milestones)

## Working rules

- The founder is still learning to code. Explain what you're doing in plain language, keep changes small, and build one milestone at a time. After each milestone, say how to test it locally.
- Ask before adding a new paid service or a big dependency.
- Never call an MCP server's tools during a check. Only discovery and listing requests (see `docs/CHECKS.md`, "Safety rules").
- Every outbound check request uses the User-Agent `ToolbeatBot/0.1 (+https://toolbeat.tech/bot)`.
- Keep secrets in environment variables; never commit `.env`.
- Match the design in `design/landing-page.dc.html` and the tokens in `docs/DESIGN.md`. Logo files are in `brand/`.
- `reference/` holds the working scripts used for the Nov 22, 2026 registry scan. Reuse their logic, but rewrite cleanly in TypeScript.
- The MCP spec changes often (a breaking release shipped 2026-07-28). Before finalizing check logic, look up the current spec at modelcontextprotocol.io and support both the current and the previous protocol versions.
