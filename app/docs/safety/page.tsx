import type { Metadata } from "next";
import Link from "next/link";
import { DocsPage } from "@/components/docs-page";

export const metadata: Metadata = {
  title: "Safety and privacy",
  description: "What Toolbeat sends to your server, what it never does, and what it stores.",
};

export default function SafetyDoc() {
  return (
    <DocsPage
      href="/docs/safety"
      eyebrow="Reference"
      title="Safety and privacy"
      intro="Toolbeat is built to be a polite, harmless visitor. Here is exactly what it does and doesn’t do."
    >
      <h2>Read-only, always</h2>
      <p>A check only sends these MCP requests:</p>
      <ul>
        <li>
          <code>server/discover</code> or <code>initialize</code> (to learn what the server is)
        </li>
        <li>
          <code>notifications/initialized</code> (required by the previous spec)
        </li>
        <li>
          <code>tools/list</code> (to read the tool list)
        </li>
      </ul>
      <p>
        It never sends <code>tools/call</code> or anything else that could run an action or change data. For sign-in
        servers it reads the public OAuth metadata and stops there.
      </p>

      <h2>No private networks</h2>
      <p>
        Because anyone can paste a URL into the free checker, Toolbeat refuses to connect to private and internal
        addresses: <code>localhost</code>, <code>10.x</code>, <code>172.16–31.x</code>, <code>192.168.x</code>,{" "}
        <code>169.254.x</code> (cloud metadata), IPv6 loopback, link-local and private ranges, and a few others. It
        checks the IP after DNS lookup and again on every connection, including redirects.
      </p>

      <h2>Polite by default</h2>
      <ul>
        <li>
          Every request identifies itself as <code>ToolbeatBot/0.1 (+https://toolbeat.tech/bot)</code>. See{" "}
          <Link href="/bot">About ToolbeatBot</Link>.
        </li>
        <li>Each request times out after 12 seconds and a whole check after 30.</li>
        <li>The free checker is rate-limited per visitor and per target server.</li>
      </ul>

      <h2>What we store</h2>
      <p>
        The free checker doesn’t store your URL or your result. We only keep daily totals of how many checks passed,
        warned or failed.
      </p>
    </DocsPage>
  );
}
