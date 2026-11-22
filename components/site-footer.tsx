import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mx-auto w-full max-w-[1120px] px-4 sm:px-6">
      <div className="flex flex-wrap justify-between gap-3 border-t border-line-soft pt-6 pb-10 text-[13px] text-subtle">
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          <span>toolbeat.tech</span>
          <Link href="/docs" className="hover:text-ink">
            Docs
          </Link>
          <Link href="/bot" className="hover:text-ink">
            About ToolbeatBot
          </Link>
        </div>
        <span>Not affiliated with Anthropic or the MCP project.</span>
      </div>
    </footer>
  );
}
