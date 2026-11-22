import type { Metadata } from "next";
import Link from "next/link";
import { DocsPage, Note } from "@/components/docs-page";
import { STEP_DOCS } from "@/lib/docs/steps";

export const metadata: Metadata = {
  title: "How a check works",
  description: "What Toolbeat checks, step by step, and why a plain uptime ping isn’t enough for MCP servers.",
};

export default function DocsHome() {
  return (
    <DocsPage
      href="/docs"
      eyebrow="Docs"
      title="How a check works"
      intro="Toolbeat connects to your MCP server the way AI clients do, one step at a time, and tells you exactly where it breaks."
    >
      <p>
        Regular uptime monitors only check that a URL answers. But an MCP server can answer <code>200 OK</code> and
        still fail every AI assistant, for example by returning a web page instead of an MCP response. Toolbeat runs
        the real thing.
      </p>

      <h2>The six steps</h2>
      <p>Each step only runs if the one before it worked. Click a step to see every possible result and how to fix it.</p>
      <ol className="not-prose !list-none !pl-0">
        {STEP_DOCS.map((s) => (
          <li key={s.id} className="!my-0">
            <Link
              href={`/docs/checks/${s.id}`}
              className="ghost -mx-3 flex gap-4 rounded-xl px-3 py-3 !no-underline"
            >
              <span className="flex size-7 flex-none items-center justify-center rounded-full bg-skip-bg font-mono text-[13px] text-ink-2">
                {s.number}
              </span>
              <span className="min-w-0">
                <span className="block font-medium text-ink">{s.title}</span>
                <span className="block text-[15px] text-muted">{s.intro}</span>
              </span>
            </Link>
          </li>
        ))}
      </ol>

      <h2>What a check never does</h2>
      <ul>
        <li>It never calls your tools or sends anything that could change data. It only discovers and lists.</li>
        <li>It never signs in as a user.</li>
        <li>It never connects to private or internal addresses.</li>
      </ul>
      <p>
        Every request uses the User-Agent <code>ToolbeatBot/0.1 (+https://toolbeat.tech/bot)</code>. Read more in{" "}
        <Link href="/docs/safety">Safety and privacy</Link>.
      </p>

      <h2>Time limits</h2>
      <p>Each request gets 12 seconds. The whole check gets 30 seconds. A server that’s slower than that counts as down, because AI clients give up too.</p>

      <Note>
        <p>
          <strong>Try it now.</strong> Paste your server URL into the <Link href="/">free checker</Link>. No sign-up
          needed.
        </p>
      </Note>
    </DocsPage>
  );
}
