"use client";

/**
 * The live checker in the hero: a URL form plus the result card.
 *
 * On first load the card plays a sample run so visitors see what a check
 * looks like. When someone submits a URL we call POST /api/check and reveal
 * the real steps one by one.
 */
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import type { CheckResult, StepResult, StepStatus } from "@/lib/checks/types";
import { cn } from "@/lib/utils";
import { WaitlistForm } from "@/components/waitlist-form";

const SAMPLE_URL = "https://mcp.example.com/mcp";

/** The sample run from the design: a server that returns a web page. */
const SAMPLE_STEPS: StepResult[] = [
  { id: "resolve", name: "Resolve mcp.example.com", status: "pass", latencyMs: 14, meta: "14 ms", message: "The domain points to a live server." },
  { id: "connect", name: "Secure connection", status: "pass", latencyMs: 41, meta: "41 ms", message: "TLS certificate matches the domain." },
  { id: "handshake", name: "MCP handshake", status: "fail", latencyMs: 120, meta: "200 text/html", message: "Got a regular web page instead of an MCP response." },
  { id: "auth", name: "Sign-in (OAuth)", status: "skip", latencyMs: null, meta: "skipped", message: "Needs a working handshake first." },
  { id: "tools", name: "Tool list", status: "skip", latencyMs: null, meta: "skipped", message: "Needs a working handshake first." },
];
const SAMPLE_DELAYS = [450, 800, 1350, 1650, 1900];

type Phase = "sample" | "checking" | "done";

export function Checker() {
  const [url, setUrl] = useState("");
  const [checkedUrl, setCheckedUrl] = useState(SAMPLE_URL);
  const [phase, setPhase] = useState<Phase>("sample");
  const [steps, setSteps] = useState<StepResult[]>(SAMPLE_STEPS);
  const [shown, setShown] = useState(0);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [error, setError] = useState<{ message: string; hint?: string } | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const request = useRef<AbortController | null>(null);
  const inputId = useId();
  const errorId = useId();

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  /** Schedule steps to appear one at a time, then call onDone. */
  const schedule = (count: number, delays: number[], onDone?: () => void) => {
    clearTimers();
    for (let i = 0; i < count; i++) {
      timers.current.push(setTimeout(() => setShown(i + 1), delays[i] ?? i * 90));
    }
    const last = delays[count - 1] ?? count * 90;
    if (onDone) timers.current.push(setTimeout(onDone, last + 300));
  };

  /** Show a new list of steps, revealed one at a time. */
  const reveal = (list: StepResult[], delays: number[], onDone: () => void) => {
    setSteps(list);
    setShown(0);
    schedule(list.length, delays, onDone);
  };

  // Play the sample run once on load.
  useEffect(() => {
    const t = timers.current;
    SAMPLE_DELAYS.forEach((d, i) => t.push(setTimeout(() => setShown(i + 1), d)));
    return () => {
      t.forEach(clearTimeout);
      request.current?.abort();
    };
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const target = url.trim();
    if (!target) {
      setError({ message: "Paste the URL of your MCP server first." });
      return;
    }
    const full = /^[a-z]+:\/\//i.test(target) ? target : `https://${target}`;

    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;

    clearTimers();
    setError(null);
    setResult(null);
    setSteps([]);
    setShown(0);
    setCheckedUrl(full);
    setPhase("checking");

    try {
      const res = await fetch("/api/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: full }),
        signal: controller.signal,
      });
      const data = await res.json();
      if (!res.ok) {
        setError({ message: data.error ?? "The check couldn't run.", hint: data.hint });
        setPhase("done");
        return;
      }
      const r = data as CheckResult;
      setResult(r);
      // Quick, slightly uneven stagger so it reads as a sequence, not a wall.
      const delays = r.steps.map((_, i) => [0, 70, 150, 240, 320, 400][i] ?? i * 80);
      reveal(r.steps, delays, () => setPhase("done"));
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setError({ message: "Couldn't reach Toolbeat. Check your connection and try again." });
      setPhase("done");
    }
  }

  const checking = phase === "checking";
  const visible = steps.slice(0, shown);
  const allShown = shown >= steps.length && steps.length > 0;
  const isSample = result === null && !error && phase !== "checking" && checkedUrl === SAMPLE_URL;
  const verdict = result?.verdict ?? (isSample && allShown ? "fail" : null);

  const dotColor = checking
    ? "var(--subtle)"
    : verdict === "pass"
      ? "var(--signal)"
      : verdict === "warn" || verdict === "rate_limited"
        ? "#C08A1E"
        : verdict === "fail" || error
          ? "#D9622B"
          : "#C9CDD1";

  return (
    <>
      <div className="min-w-0 flex-[1_1_420px]">
        <h1 className="hero-in max-w-[560px] text-[clamp(40px,5.4vw,62px)] leading-[1.02] font-semibold tracking-[-0.045em] text-balance">
          Your MCP server says it’s up. Can Claude connect to it?
        </h1>
        <p className="hero-in d1 mt-[22px] max-w-[500px] text-lg leading-[1.6] tracking-[-0.01em] text-muted">
          Toolbeat sends the same handshake Claude, ChatGPT and Cursor send, then shows you the exact step where it
          breaks.
        </p>

        <form
          onSubmit={onSubmit}
          noValidate
          className="hero-in d2 mt-8 flex max-w-[520px] flex-wrap gap-2 rounded-[14px] border border-line bg-surface p-1.5 shadow-[0_1px_2px_rgba(14,17,20,.04),0_8px_24px_-12px_rgba(14,17,20,.12)] transition-[border-color,box-shadow] duration-150 focus-within:border-ink focus-within:shadow-[0_0_0_4px_rgba(14,17,20,.08)]"
        >
          <label htmlFor={inputId} className="sr-only">
            MCP server address
          </label>
          <input
            id={inputId}
            type="url"
            inputMode="url"
            autoComplete="url"
            spellCheck={false}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://mcp.yourcompany.com/mcp"
            aria-invalid={!!error}
            aria-describedby={error ? errorId : undefined}
            className="h-[46px] min-w-0 flex-[1_1_240px] rounded-[10px] bg-transparent px-3.5 font-mono text-sm text-ink outline-none"
          />
          <button
            type="submit"
            disabled={checking}
            className="press flex h-[46px] flex-[0_0_auto] cursor-pointer items-center gap-2 rounded-[10px] bg-ink px-5 text-[15px] font-medium text-white disabled:cursor-progress"
          >
            {checking && <Spinner />}
            <span>{checking ? "Checking" : "Check server"}</span>
          </button>
        </form>

        {error ? (
          <p id={errorId} role="alert" className="row-in mt-3.5 ml-1 max-w-[520px] text-[13.5px] text-fail">
            {error.message}
            {error.hint && <span className="text-muted"> {error.hint}</span>}
          </p>
        ) : (
          <p className="hero-in d3 mt-3.5 ml-1 text-[13px] text-subtle">
            Free. A few public requests. No tools are called and nothing is stored.
          </p>
        )}
      </div>

      <section
        aria-label="Check result"
        className="hero-in d2 min-w-0 flex-[1_1_440px] overflow-hidden rounded-[18px] border border-line bg-surface shadow-[0_1px_2px_rgba(14,17,20,.04),0_24px_48px_-24px_rgba(14,17,20,.18)]"
      >
        <div className="flex items-center justify-between gap-3 border-b border-skip-bg px-[18px] py-3.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="relative size-2 flex-none">
              {checking && <span className="ping absolute inset-0 rounded-full bg-subtle" />}
              <span
                className="absolute inset-0 rounded-full transition-colors duration-200"
                style={{ background: dotColor }}
              />
            </span>
            <span className="truncate font-mono text-[13px] text-ink-2">{checkedUrl}</span>
          </div>
          <span className="flex-none text-xs text-subtle">
            {checking ? "Running" : isSample ? "Sample run" : result ? `${(result.totalMs / 1000).toFixed(1)} s` : ""}
          </span>
        </div>

        <div className="min-h-[268px] py-2" aria-busy={checking}>
          {checking && <CheckingRows />}
          {visible.map((s) => (
            <StepRow key={`${checkedUrl}-${s.id}`} step={s} interactive={!isSample} />
          ))}
          {error && !checking && (
            <div className="row-in px-[18px] py-3 text-[13.5px] text-muted">No check was run.</div>
          )}
        </div>

        <div aria-live="polite">
          {allShown && phase !== "checking" && verdict && (
            <Verdict verdict={verdict} summary={result?.summary ?? "AI clients can’t connect"} isSample={isSample} />
          )}
        </div>
      </section>
    </>
  );
}

function Spinner() {
  return (
    <svg className="spin" width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6.5" stroke="rgba(255,255,255,.25)" strokeWidth="2" />
      <path d="M14.5 8A6.5 6.5 0 0 0 8 1.5" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** Placeholder rows while the real check runs (checks take a few seconds). */
function CheckingRows() {
  return (
    <div className="row-in px-[18px] py-3">
      <div className="flex items-center gap-3.5">
        <span className="flex size-5 flex-none items-center justify-center rounded-full bg-skip-bg">
          <svg className="spin" width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle cx="8" cy="8" r="6" stroke="#D5D9DD" strokeWidth="2.2" />
            <path d="M14 8A6 6 0 0 0 8 2" stroke="#5B636B" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        </span>
        <div className="min-w-0">
          <div className="text-[14.5px] font-medium tracking-[-0.01em]">Checking the server</div>
          <div className="mt-0.5 text-[13.5px] text-muted">
            Resolving, connecting, then sending the MCP handshake. This takes a few seconds.
          </div>
        </div>
      </div>
    </div>
  );
}

const ICON_BG: Record<StepStatus, string> = {
  pass: "bg-pass-bg",
  fail: "bg-fail-bg",
  warn: "bg-[#FBF3DF]",
  skip: "bg-skip-bg",
};

function StatusIcon({ status }: { status: StepStatus }) {
  return (
    <span
      className={cn("mt-px flex size-5 flex-none items-center justify-center rounded-full", ICON_BG[status])}
    >
      {status === "pass" && (
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" role="img" aria-label="Passed">
          <path d="M2.5 6.3 5 8.7l4.5-5.2" stroke="#0F7C70" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      {status === "fail" && (
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" role="img" aria-label="Failed">
          <path d="M3.5 3.5l5 5M8.5 3.5l-5 5" stroke="#B4441C" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      )}
      {status === "warn" && (
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" role="img" aria-label="Warning">
          <path d="M6 3v3.6" stroke="#8A5A00" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="6" cy="9" r="1" fill="#8A5A00" />
        </svg>
      )}
      {status === "skip" && (
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" role="img" aria-label="Skipped">
          <path d="M3.5 6h5" stroke="#8A9199" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      )}
    </span>
  );
}

function StepRow({ step, interactive }: { step: StepResult; interactive: boolean }) {
  const showHint = interactive && step.hint && (step.status === "fail" || step.status === "warn");
  return (
    <div className="row-in flex items-start gap-3.5 px-[18px] py-3">
      <StatusIcon status={step.status} />
      <div className="min-w-0 flex-auto">
        <div className="flex items-baseline justify-between gap-3">
          <span
            className={cn(
              "text-[14.5px] font-medium tracking-[-0.01em]",
              step.status === "skip" ? "text-subtle" : "text-ink",
            )}
          >
            {step.name}
          </span>
          <span className="max-w-[45%] flex-none truncate font-mono text-xs text-subtle">{step.meta}</span>
        </div>
        <div className="mt-0.5 text-[13.5px] text-muted">{step.message}</div>
        {showHint && (
          <div className="mt-1.5 text-[13px] text-ink-2">
            <span className="font-medium">Fix: </span>
            {step.hint}{" "}
            <Link
              href={`/docs/checks/${step.id}${step.code ? `#${step.code.toLowerCase()}` : ""}`}
              className="whitespace-nowrap text-ink underline decoration-line underline-offset-[3px] transition-[text-decoration-color] hover:decoration-signal"
            >
              Learn more
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function Verdict({
  verdict,
  summary,
  isSample,
}: {
  verdict: CheckResult["verdict"];
  summary: string;
  isSample: boolean;
}) {
  const [asking, setAsking] = useState(false);
  const styles = {
    fail: { box: "bg-[#FBF1EC]", title: "text-[#7A2E12]", body: "text-[#8F4A2C]" },
    warn: { box: "bg-[#FBF5E6]", title: "text-[#5E4100]", body: "text-[#7A5A12]" },
    rate_limited: { box: "bg-wash", title: "text-ink", body: "text-muted" },
    pass: { box: "bg-pass-bg", title: "text-[#0A4F47]", body: "text-[#1F6A60]" },
  }[verdict];

  const body = {
    fail: isSample
      ? "A regular uptime check would still show this server as up."
      : "Fix the step marked above, then check again.",
    warn: "It works today, but fix the warnings before they turn into outages.",
    rate_limited: "This isn’t a failure. Try again in a few minutes.",
    pass: "Servers break without warning. Get an email the moment it happens.",
  }[verdict];

  return (
    <div
      className={cn(
        "row-in mx-2.5 mb-2.5 flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3.5",
        styles.box,
      )}
    >
      <div className="min-w-0">
        <div className={cn("text-[14.5px] font-semibold tracking-[-0.01em]", styles.title)}>{summary}</div>
        <div className={cn("text-[13px]", styles.body)}>{body}</div>
      </div>
      {verdict !== "rate_limited" && !asking && (
        <button
          type="button"
          onClick={() => setAsking(true)}
          aria-expanded={asking}
          className="press cursor-pointer rounded-lg bg-ink px-3 py-2 text-[13.5px] font-medium whitespace-nowrap text-white"
        >
          {verdict === "pass" ? "Monitor this server" : "Alert me next time"}
        </button>
      )}
      {asking && (
        <div className="row-in w-full">
          <p className={cn("mb-2 text-[13px]", styles.body)}>
            Monitoring is in early access. Join the waitlist and we’ll email you when it opens.
          </p>
          <WaitlistForm source="result" tone="light" autoFocus />
        </div>
      )}
    </div>
  );
}
