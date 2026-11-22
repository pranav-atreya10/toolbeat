# Checks (the core of Toolbeat)

A "check" runs a short series of steps against one remote MCP endpoint and returns a result for each step. Steps stop early when a later step can't run.

Reference implementation: `reference/scan-probe.mjs` (used to scan 29,439 servers on Nov 22, 2026). Rewrite in TypeScript as `lib/checks/`.

## Steps

| # | Step | How | Pass | Fail examples |
|---|------|-----|------|---------------|
| 1 | Resolve | DNS lookup of the host | resolves | `ENOTFOUND` |
| 2 | Connect | open HTTPS connection | TLS ok | timeout, cert doesn't match domain, TLS error |
| 3 | Handshake | POST an MCP `initialize` JSON-RPC request (details below) | valid JSON-RPC `result`, OR `401` with a proper OAuth challenge | 404, 405, 5xx, HTML body, non-JSON-RPC body, hang |
| 4 | Sign-in (OAuth) | only if step 3 got 401/403 | `WWW-Authenticate` header present AND protected resource metadata (`/.well-known/oauth-protected-resource`) returns `authorization_servers` | 401 with no header, missing metadata |
| 5 | Tool list | only if step 3 returned a result: send `notifications/initialized`, then `tools/list` | tools array returned, each tool has `inputSchema` with `type: "object"` | error, invalid schemas |
| 6 | Tool quality (warning, not failure) | inspect the tool list | descriptions present (≥10 chars) | missing descriptions, zero tools |

Record latency for each step.

## Handshake request

```
POST <endpoint>
Content-Type: application/json
Accept: application/json, text/event-stream
User-Agent: ToolbeatBot/0.1 (+https://toolbeat.tech/bot)

{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"toolbeat","version":"0.1"}}}
```

- The response may be plain JSON or Server-Sent Events. For SSE, parse `data:` lines and take the first message that has `result` or `error`.
- If the server returns an `Mcp-Session-Id` header, send it on follow-up requests, along with `MCP-Protocol-Version` set to the version the server returned.
- **Spec version warning:** MCP's 2026-07-28 release replaced the `initialize` handshake and session IDs with a stateless model (a `server/discover` method). A server on the new spec may reject `initialize`, and that is NOT a failure. Look up the current spec and implement: try the current-spec discovery first, then fall back to `initialize`. A JSON-RPC error saying the method or version is unsupported should trigger the fallback, not a failure.
- Servers that only offer the deprecated SSE transport (`type: "sse"` in the registry): GET with `Accept: text/event-stream`, check that it connects, and add a warning: "Uses the deprecated SSE transport."

## Result states

- `pass`: all required steps passed
- `warn`: passed, with warnings (deprecated SSE, missing tool descriptions)
- `fail`: a required step failed
- Treat `429` as "rate limited", not a failure: retry later

## Avoiding false alarms (important)

- Only mark a monitor as DOWN after **2 failed checks in a row**, at least 1 minute apart.
- Mark RECOVERED after 1 passing check.
- One email per state change (down, recovered). No repeats while it stays down.

In the Nov 22 scan, 97% of failing servers were still failing 10–20 minutes later, so real outages are persistent, but single blips do happen.

## Plain-English messages

Each failure maps to a message plus a fix hint. Examples:
- ENOTFOUND: "The domain doesn't resolve, so nothing can connect. Check the DNS record for this host."
- 404: "The endpoint returned 404. Check the URL path, usually /mcp."
- HTML body: "Got a regular web page instead of an MCP response. Make sure this path routes to your MCP handler."
- Cloudflare 530: "Cloudflare can't reach your server. The server or tunnel behind Cloudflare is probably offline."
- 401 without `WWW-Authenticate`: "Your server requires sign-in but doesn't tell clients how. Add a WWW-Authenticate header pointing to your protected resource metadata."

## Safety rules

- Never call `tools/call` or any method that could change data.
- Timeouts: 12s per request; whole check ≤ 30s.
- The public checker: rate-limit by IP (e.g. 10 checks/hour) and by target host. Block private and internal addresses (localhost, 10.x, 172.16–31.x, 192.168.x, 169.254.x, IPv6 loopback/link-local) to prevent SSRF. Resolve DNS first and check the IP, then connect to that IP.
- Don't follow redirects to private addresses.
- Don't store results from the public checker beyond aggregate counts.
