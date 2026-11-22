import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DocsPage } from "@/components/docs-page";
import { MESSAGES, type MessageCode } from "@/lib/checks/messages";
import { STEP_DOCS, getStepDoc } from "@/lib/docs/steps";
import { cn } from "@/lib/utils";

export function generateStaticParams() {
  return STEP_DOCS.map((s) => ({ step: s.id }));
}

export async function generateMetadata({ params }: PageProps<"/docs/checks/[step]">): Promise<Metadata> {
  const doc = getStepDoc((await params).step);
  return doc ? { title: `${doc.title} check`, description: doc.intro } : {};
}

/** Example values so the messages read naturally on the docs page. */
const EXAMPLE = {
  status: 502,
  host: "mcp.yourcompany.com",
  url: "https://mcp.yourcompany.com/mcp/",
  detail: undefined,
  names: ["search", "get_page"],
  count: 2,
  days: 9,
  versions: ["2024-11-05"],
};

const ORDER = { fail: 0, warn: 1, info: 2, pass: 3 } as const;
const LABEL = { fail: "Fails", warn: "Warning", info: "Note", pass: "Passes" } as const;
const BADGE = {
  fail: "bg-fail-bg text-fail",
  warn: "bg-[#FBF3DF] text-[#7A5A12]",
  info: "bg-skip-bg text-ink-2",
  pass: "bg-pass-bg text-signal",
} as const;

export default async function StepDocPage({ params }: PageProps<"/docs/checks/[step]">) {
  const doc = getStepDoc((await params).step);
  if (!doc) notFound();

  const outcomes = (Object.keys(MESSAGES) as MessageCode[])
    .filter((code) => MESSAGES[code].step === doc.id)
    .sort((a, b) => ORDER[MESSAGES[a].severity] - ORDER[MESSAGES[b].severity]);

  return (
    <DocsPage href={`/docs/checks/${doc.id}`} eyebrow={`Step ${doc.number} of 6`} title={doc.title} intro={doc.intro}>
      {doc.body}

      <h2>Every possible result</h2>
      <p>These are the exact messages the checker shows for this step, with how to fix each one.</p>
      <div className="not-prose flex flex-col gap-3">
        {outcomes.map((code) => {
          const def = MESSAGES[code];
          // A "wrong kind of answer" reads better with a 200 than a 502.
          const example = code === "NOT_JSONRPC" ? { ...EXAMPLE, status: 200 } : EXAMPLE;
          const hint = "hint" in def ? def.hint?.(example) : undefined;
          return (
            <section
              key={code}
              id={code.toLowerCase()}
              className="scroll-mt-24 rounded-xl border border-line bg-surface p-4 target:border-ink target:shadow-[0_0_0_4px_rgba(14,17,20,.06)]"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className={cn("rounded-md px-1.5 py-0.5 text-xs font-medium", BADGE[def.severity])}>
                  {LABEL[def.severity]}
                </span>
                <h3 className="!m-0 !text-[15px] font-semibold tracking-[-0.01em]">{def.title}</h3>
                <a
                  href={`#${code.toLowerCase()}`}
                  className="ml-auto font-mono text-xs !text-subtle !no-underline hover:!text-ink"
                  aria-label={`Link to ${def.title}`}
                >
                  {code}
                </a>
              </div>
              <p className="!mt-2 !mb-0 text-[15px]">{def.message(example)}</p>
              {hint && (
                <p className="!mt-1.5 !mb-0 text-[15px] text-ink">
                  <span className="font-medium">Fix: </span>
                  {hint}
                </p>
              )}
            </section>
          );
        })}
      </div>
    </DocsPage>
  );
}
