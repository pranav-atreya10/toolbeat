import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About ToolbeatBot",
  description: "What ToolbeatBot is, why it visited your server, and how to block it.",
};

export default function BotPage() {
  return (
    <main className="mx-auto max-w-[720px] px-4 pt-14 pb-24 sm:px-6">
      <div className="mb-3 text-sm text-subtle">ToolbeatBot</div>
      <h1 className="text-[clamp(32px,4vw,44px)] leading-[1.08] font-semibold tracking-[-0.04em] text-balance">
        Why did ToolbeatBot visit my server?
      </h1>
      <p className="mt-4 text-lg leading-[1.6] text-muted">
        ToolbeatBot checks that MCP servers work for AI clients. If you saw it in your logs, someone checked your
        server’s health with Toolbeat.
      </p>

      <div className="prose-docs mt-8">
        <h2>How to recognise it</h2>
        <pre>
          <code>User-Agent: ToolbeatBot/0.1 (+https://toolbeat.tech/bot)</code>
        </pre>

        <h2>When it visits</h2>
        <ul>
          <li>
            Someone pasted your server’s URL into the <Link href="/">free checker</Link>. That’s one short check.
          </li>
          <li>When monitoring launches: the server’s owner (or their team) set up scheduled checks.</li>
        </ul>
        <p>ToolbeatBot doesn’t crawl the web or follow links. It only visits URLs people give it.</p>

        <h2>What it does</h2>
        <p>
          A check is a handful of read-only requests: a DNS lookup, an HTTPS connection, an MCP discovery or{" "}
          <code>initialize</code> request, and a <code>tools/list</code> request. It never calls your tools, never
          signs in, and never changes anything. The full list is in <Link href="/docs/safety">Safety and privacy</Link>.
        </p>

        <h2>How to block it</h2>
        <p>
          Block requests whose User-Agent contains <code>ToolbeatBot</code> in your firewall, CDN or server. Checks
          will then show your server as failing, which is accurate from Toolbeat’s point of view.
        </p>
      </div>
    </main>
  );
}
