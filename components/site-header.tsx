import Link from "next/link";
import { Logo } from "@/components/logo";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-10 border-b border-line-soft bg-background/80 backdrop-blur-md backdrop-saturate-150">
      <nav
        aria-label="Main"
        className="mx-auto flex max-w-[1120px] items-center justify-between gap-4 px-4 py-3.5 sm:px-6"
      >
        <Link href="/" className="flex items-center rounded-md" aria-label="Toolbeat home">
          <Logo height={20} />
        </Link>
        <div className="flex items-center gap-1">
          <Link
            href="/docs"
            className="ghost rounded-lg px-3 py-2 text-sm font-medium text-ink-2"
          >
            Docs
          </Link>
          <Link
            href="/#why"
            className="ghost hidden rounded-lg px-3 py-2 text-sm font-medium text-ink-2 sm:block"
          >
            How it works
          </Link>
          <Link
            href="/#alerts"
            className="press ml-1 rounded-lg bg-ink px-3.5 py-2 text-sm font-medium text-white"
          >
            Get alerts
          </Link>
        </div>
      </nav>
    </header>
  );
}
