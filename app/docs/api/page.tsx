import type { Metadata } from "next";
import { DocsPage, Note } from "@/components/docs-page";
import { LIMITS } from "@/lib/rate-limit";

export const metadata: Metadata = {
  title: "Check API",
  description: "Run a Toolbeat check from your own code or the command line.",
};

export default function ApiDoc() {
  return (
    <DocsPage
      href="/docs/api"
      eyebrow="Reference"
      title="Check API"
      intro="The free checker on the home page uses a public API. You can call it too."
    >
      <h2>Run a check</h2>
      <pre>
        <code>{`curl -X POST https://toolbeat.tech/api/check \\
  -H "Content-Type: application/json" \\
  -d '{"url": "https://mcp.yourcompany.com/mcp"}'`}</code>
      </pre>

      <h2>The response</h2>
      <pre>
        <code>{`{
  "url": "https://mcp.yourcompany.com/mcp",
  "verdict": "fail",              // pass | warn | fail | rate_limited
  "summary": "AI clients can't connect",
  "protocol": { "era": "legacy", "version": "2025-11-25" },
  "steps": [
    {
      "id": "handshake",
      "name": "MCP handshake",
      "status": "fail",           // pass | warn | fail | skip
      "latencyMs": 212,
      "meta": "200 text/html",
      "message": "Got a regular web page instead of an MCP response.",
      "hint": "Make sure this path routes to your MCP handler, not your website or a login page.",
      "code": "HTML_RESPONSE"
    }
  ],
  "totalMs": 380,
  "checkedAt": "2026-11-22T18:04:11.000Z"
}`}</code>
      </pre>
      <p>
        The <code>code</code> field is stable, so you can match on it. Every code is listed on its step’s docs page.
      </p>

      <h2>Errors</h2>
      <ul>
        <li>
          <code>400</code>: the body isn’t valid, or the URL isn’t a public HTTPS address. The response has an{" "}
          <code>error</code> and usually a <code>hint</code>.
        </li>
        <li>
          <code>429</code>: you hit the rate limit. Wait for the number of seconds in the <code>Retry-After</code>{" "}
          header.
        </li>
      </ul>

      <h2>Limits</h2>
      <ul>
        <li>{LIMITS.perIp} checks per hour from one IP address.</li>
        <li>{LIMITS.perHost} checks per hour against the same server, from everyone combined.</li>
      </ul>
      <Note>
        <p>
          Need scheduled checks, alerts or more volume? Monitoring with webhooks is coming soon. Join the waitlist on
          the home page.
        </p>
      </Note>
    </DocsPage>
  );
}
