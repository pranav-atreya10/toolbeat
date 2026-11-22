import Link from "next/link";
import { DOCS_ORDER } from "@/lib/docs/nav";

/** Standard wrapper for a docs page: title, intro, body, and prev/next links. */
export function DocsPage({
  href,
  eyebrow,
  title,
  intro,
  children,
}: {
  href: string;
  eyebrow?: string;
  title: string;
  intro: React.ReactNode;
  children: React.ReactNode;
}) {
  const i = DOCS_ORDER.findIndex((p) => p.href === href);
  const prev = i > 0 ? DOCS_ORDER[i - 1] : null;
  const next = i >= 0 && i < DOCS_ORDER.length - 1 ? DOCS_ORDER[i + 1] : null;

  return (
    <article className="max-w-[720px]">
      {eyebrow && <div className="mb-3 text-sm text-subtle">{eyebrow}</div>}
      <h1 className="text-[clamp(32px,4vw,44px)] leading-[1.08] font-semibold tracking-[-0.04em] text-balance">{title}</h1>
      <p className="mt-4 text-lg leading-[1.6] text-muted">{intro}</p>
      <div className="prose-docs mt-8">{children}</div>
      <nav aria-label="More docs" className="mt-16 grid grid-cols-2 gap-3 border-t border-line-soft pt-6 text-sm">
        <div>
          {prev && (
            <Link href={prev.href} className="ghost -ml-2.5 inline-block rounded-lg px-2.5 py-2">
              <span className="block text-subtle">Previous</span>
              <span className="font-medium">{prev.label}</span>
            </Link>
          )}
        </div>
        <div className="text-right">
          {next && (
            <Link href={next.href} className="ghost -mr-2.5 inline-block rounded-lg px-2.5 py-2">
              <span className="block text-subtle">Next</span>
              <span className="font-medium">{next.label}</span>
            </Link>
          )}
        </div>
      </nav>
    </article>
  );
}

/** A small callout box. */
export function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-5 rounded-xl border border-line bg-surface px-4 py-3.5 text-[15px] text-ink-2 [&>p:last-child]:mb-0">
      {children}
    </div>
  );
}
