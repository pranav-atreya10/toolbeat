import { Checker } from "@/components/checker";
import { WaitlistForm } from "@/components/waitlist-form";

/** Failures from the Nov 22, 2026 registry scan (docs/RESEARCH.md). */
const SCAN = [
  { label: "Can’t connect at all", count: 708 },
  { label: "404 Not Found", count: 584 },
  { label: "Server error (5xx)", count: 437 },
  { label: "Responds, but not with MCP", count: 126 },
  { label: "Connects, then times out", count: 45 },
];
const SCAN_MAX = Math.max(...SCAN.map((s) => s.count));

export default function Home() {
  return (
    <main id="top" className="mx-auto max-w-[1120px] px-4 sm:px-6">
      {/* Hero + live checker */}
      <section className="flex flex-wrap items-center gap-14 pt-16 pb-20 sm:pt-24 sm:pb-[104px]">
        <Checker />
      </section>

      {/* Ping vs handshake */}
      <section id="why" className="scroll-mt-20 pt-6 pb-24 sm:pb-28">
        <h2 className="max-w-[620px] text-[clamp(30px,3.6vw,40px)] leading-[1.1] font-semibold tracking-[-0.035em] text-balance">
          A ping and a handshake see the same server very differently.
        </h2>
        <p className="mt-4 mb-10 max-w-[560px] text-[17px] text-muted">
          Uptime monitors only ask whether a URL answers. MCP clients need a real MCP response, so a server can pass
          every ping and still fail every assistant.
        </p>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))] gap-4">
          <CompareCard
            label="Regular uptime monitor"
            code={["GET /mcp", "200 OK  text/html"]}
            ok
            verdict="Shows the server as up"
          />
          <CompareCard
            label="Toolbeat"
            code={["POST /mcp  initialize", "expected JSON-RPC, got HTML"]}
            verdict="Catches the broken handshake"
          />
        </div>
        <p className="mt-5 max-w-[560px] text-sm text-subtle">
          For servers behind a sign-in, Toolbeat also checks that clients get the 401 and sign-in details they need to
          start OAuth.
        </p>
      </section>

      {/* Scan results */}
      <section className="flex flex-wrap items-start gap-14 pb-24 sm:pb-28">
        <div className="min-w-0 flex-[1_1_340px]">
          <h2 className="text-[clamp(30px,3.6vw,40px)] leading-[1.1] font-semibold tracking-[-0.035em] text-balance">
            1,900 company MCP servers were broken on Nov 22.
          </h2>
          <p className="mt-4 text-[17px] text-muted">
            We checked all 29,439 company-owned remote servers in the official MCP Registry. 6.5% failed. When we
            re-checked about 1,250 of them 10 to 20 minutes later, 97% were still down.
          </p>
        </div>
        <ul className="flex min-w-0 flex-[1_1_420px] flex-col gap-3.5 pt-1.5" aria-label="Why servers failed">
          {SCAN.map((b) => (
            <li key={b.label}>
              <div className="mb-1.5 flex justify-between gap-3 text-sm">
                <span className="text-ink-2">{b.label}</span>
                <span className="font-mono text-[13px] text-ink">{b.count.toLocaleString("en-US")}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[#EEF0F1]" aria-hidden="true">
                <div className="h-full rounded-full bg-ink" style={{ width: `${Math.round((b.count / SCAN_MAX) * 100)}%` }} />
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Alerts / waitlist */}
      <section id="alerts" className="scroll-mt-20 pb-24">
        <div className="flex flex-wrap items-center justify-between gap-8 rounded-3xl bg-ink p-[clamp(28px,6vw,64px)] text-white">
          <div className="min-w-0 flex-[1_1_360px]">
            <h2 className="text-[clamp(28px,3.4vw,38px)] leading-[1.1] font-semibold tracking-[-0.035em]">
              Find out before your users do.
            </h2>
            <p className="mt-3.5 max-w-[440px] text-base text-[#A6ADB4]">
              Toolbeat will run this check around the clock and email you the moment a handshake fails. Join the
              waitlist for early access.
            </p>
          </div>
          <div className="min-w-0 flex-[1_1_360px]">
            <WaitlistForm source="footer" />
          </div>
        </div>
      </section>
    </main>
  );
}

function CompareCard({ label, code, ok = false, verdict }: { label: string; code: string[]; ok?: boolean; verdict: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-6">
      <div className="mb-[18px] text-sm text-muted">{label}</div>
      <div className="rounded-[10px] bg-wash px-4 py-3.5 font-mono text-[13px] leading-[1.9] text-ink-2">
        {code.map((line) => (
          <div key={line} className="whitespace-pre-wrap">
            {line}
          </div>
        ))}
      </div>
      <div className={`mt-[18px] flex items-center gap-2 font-medium ${ok ? "text-signal" : "text-fail"}`}>
        {ok ? (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle cx="8" cy="8" r="7" fill="#E4F3EF" />
            <path d="M4.8 8.3 7 10.4l4.2-4.8" stroke="#0F7C70" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle cx="8" cy="8" r="7" fill="#FBEAE2" />
            <path d="M5.6 5.6l4.8 4.8M10.4 5.6l-4.8 4.8" stroke="#B4441C" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        )}
        {verdict}
      </div>
    </div>
  );
}
