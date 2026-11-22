# Research and evidence (as of Nov 22, 2026)

## Registry scan (Nov 22, 2026)

- Pulled the official MCP Registry: 70,234 unique servers, 47,322 with remote endpoints.
- 29,439 are company-owned (domain-verified namespace, not `io.github.*`).
- One public `initialize` check each: **1,900 failed (6.5%)**
  - 708 can't connect (DNS, refused, TLS)
  - 584 return 404
  - 437 return 5xx (incl. Cloudflare 52x/530)
  - 126 respond, but not with MCP (HTML, 405, 410)
  - 45 connect, then time out
- About 1,250 failing servers re-checked 10–20 min later: 97% still failing.
- Not counted as failures: 401/403 (normal for sign-in servers), 429, JSON-RPC errors from servers that may be on the newer spec.
- Chart: `design/scan-chart.png`. Scripts: `reference/`.

## Customer feedback

- Emailed 74 companies with failing servers (70 delivered).
- One company replied within minutes: they didn't know, and their uptime monitor checked a health URL that kept returning 200. Their exact requirement: "send a real MCP initialize request and judge the answer (a JSON-RPC result, or a 401 with the OAuth challenge), not just whether the URL returns 200." They agreed to test an early version for feedback but are not planning to pay.
- Status: 1 tester, 0 paying. Replies were still coming in at the time of writing.

## Competitors (found Nov 22, 2026)

- **Cronitor**: published a guide (Aug 2026) for monitoring MCP servers with JSON-RPC uptime checks. Biggest threat: established, but MCP is one feature among many.
- **MCP Uptime Ledger**: paid remote MCP for uptime, schema validation and auth failure detection.
- **OpenStatus**: open-source uptime monitoring; MCP protocol checks discussed publicly.
- **mcp-server-health-monitor**: open source, calls list_tools, but runs locally only.
- Generic uptime tools (UptimeRobot, Pingdom, Better Stack) only check HTTP status.

How Toolbeat differs: MCP-only focus, plain-English diagnosis of exactly which step failed, free public checker, spec-version awareness, built for small teams.
