# Product

## The problem

Companies publish remote MCP servers so AI assistants (Claude, ChatGPT, Cursor, etc.) can use their product. When the server breaks, every assistant quietly fails to connect, and the company often doesn't know.

Regular uptime monitors (UptimeRobot, Pingdom, etc.) only check that a URL answers. An MCP server can return `200 OK` to a ping while the actual MCP handshake fails (for example, it returns an HTML page instead of JSON-RPC). A real customer told us exactly this: their uptime check was green the whole time.

## Who it's for

- Primary: small and mid-size software companies whose MCP server is part of their product (engineering lead pays; product/devrel reads reports)
- Secondary: agencies that build MCP servers for clients

## One engine, two audiences

- Developers: API, webhooks, later a CLI / GitHub Action
- Business users: dashboard, public status page, plain-English email alerts, weekly report

## MVP features (in priority order)

1. **Free public checker**: paste a URL on the landing page, get a pass/fail result with each step explained. No login. Rate-limited.
2. **Waitlist**: email capture on the landing page and on every check result.
3. **Accounts + monitors**: sign in, add servers, run checks on a schedule (every 5 min to start).
4. **Alerts**: email when a server goes from passing to failing, and when it recovers. No repeat spam while it stays down.
5. **History**: per-server timeline of check results and incidents.
6. **Public status page + README badge** per server (optional, owner turns it on).

## Not in the MVP

- Calling tools or running agent tasks against servers
- Logged-in "deep checks" with customer tokens (later)
- Payments (later; see ROADMAP)
- Slack alerts (later)

## Pricing (planned, not built yet)

- Free: 1 server, checks every 15 min, email alerts
- Pro, $29/mo: 5 servers, every minute, history, status page
- Team, $99/mo: 25 servers, deep checks, weekly report

## Copy rules

Plain language, sentence case, active voice. Say what happened and how to fix it. Example: "Your server returned a web page instead of an MCP response. Check that /mcp routes to your MCP handler." Never vague, never apologizing.
