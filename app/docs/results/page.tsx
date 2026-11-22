import type { Metadata } from "next";
import Link from "next/link";
import { DocsPage } from "@/components/docs-page";

export const metadata: Metadata = {
  title: "Reading your result",
  description: "What pass, warning, fail and rate limited mean in a Toolbeat check.",
};

const VERDICTS = [
  {
    name: "Pass",
    color: "bg-pass-bg text-signal",
    text: "Every required step worked. AI clients can connect, and if your server needs sign-in, they get the details to start it.",
  },
  {
    name: "Warning",
    color: "bg-[#FBF3DF] text-[#7A5A12]",
    text: "The server works, but something will cause trouble soon: a certificate about to expire, the deprecated SSE transport, or tools without descriptions.",
  },
  {
    name: "Fail",
    color: "bg-fail-bg text-fail",
    text: "A required step failed. At least some AI clients can’t use your server right now. The failed step says what happened and how to fix it.",
  },
  {
    name: "Rate limited",
    color: "bg-skip-bg text-ink-2",
    text: "Your server answered 429 Too Many Requests. That’s not a failure. Toolbeat stops and tries again later.",
  },
];

export default function ResultsDoc() {
  return (
    <DocsPage
      href="/docs/results"
      eyebrow="Docs"
      title="Reading your result"
      intro="Every check ends with one of four results, and every step shows what happened, how long it took, and how to fix it."
    >
      <h2>The four results</h2>
      <div className="not-prose flex flex-col gap-3">
        {VERDICTS.map((v) => (
          <div key={v.name} className="flex gap-3 rounded-xl border border-line bg-surface p-4">
            <span className={`h-fit flex-none rounded-md px-1.5 py-0.5 text-xs font-medium ${v.color}`}>{v.name}</span>
            <p className="!m-0 text-[15px]">{v.text}</p>
          </div>
        ))}
      </div>

      <h2>Each step</h2>
      <ul>
        <li>
          <strong>Passed</strong>, <strong>warning</strong> or <strong>failed</strong>, with a one-line explanation.
        </li>
        <li>
          <strong>Skipped</strong> when an earlier step failed, or when the step doesn’t apply (for example, sign-in
          on a server that doesn’t need it).
        </li>
        <li>
          The note on the right shows timing (like <code>41 ms</code>) or the HTTP answer (like{" "}
          <code>200 text/html</code>).
        </li>
        <li>
          Failures and warnings include a <strong>Fix</strong> line and a link to the matching section of these docs.
        </li>
      </ul>

      <h2>Avoiding false alarms</h2>
      <p>
        The free checker shows a single run. When monitoring launches, Toolbeat will only mark a server as down after{" "}
        <strong>two failed checks in a row</strong>, at least a minute apart, and mark it recovered after one passing
        check. You’ll get one email when it goes down and one when it recovers, never a stream of repeats.
      </p>
      <p>
        In our <Link href="/#why">registry scan</Link>, 97% of failing servers were still failing 10 to 20 minutes
        later, so real outages tend to last. But single blips happen, and two checks filter them out.
      </p>
    </DocsPage>
  );
}
