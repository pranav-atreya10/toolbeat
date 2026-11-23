"use client";

import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type Source = "hero" | "result" | "footer";

/**
 * Email sign-up for the waitlist.
 * - tone="dark": for the black "Get alerts" panel.
 * - tone="light": for light backgrounds, like the check result card.
 */
export function WaitlistForm({
  source,
  tone = "dark",
  autoFocus = false,
}: {
  source: Source;
  tone?: "dark" | "light";
  autoFocus?: boolean;
}) {
  const [email, setEmail] = useState("");
  const [trap, setTrap] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "joined">("idle");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const errorId = useId();
  const dark = tone === "dark";

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
      setError("Enter a valid email address.");
      inputRef.current?.focus();
      return;
    }
    setState("sending");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), source, company: trap }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "That didn’t work. Try again.");
        setState("idle");
        return;
      }
      setState("joined");
    } catch {
      setError("Couldn’t reach Toolbeat. Check your connection and try again.");
      setState("idle");
    }
  }

  if (state === "joined") {
    return (
      <div role="status" className={cn("row-in flex items-center gap-2.5 text-[15px]", dark ? "text-white" : "text-ink")}>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" className="flex-none">
          <circle cx="10" cy="10" r="10" fill={dark ? "#5FD3C1" : "#0F7C70"} />
          <path
            d="M6 10.3 8.6 13 14 7"
            stroke={dark ? "#0E1114" : "#FFFFFF"}
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span>You’re on the list. We’ll email {email.trim()} when early access opens.</span>
      </div>
    );
  }

  return (
    <div className="w-full">
      <form
        onSubmit={onSubmit}
        noValidate
        className={cn(
          "flex flex-wrap gap-2 rounded-[14px] border p-1.5 transition-[border-color,box-shadow] duration-150",
          dark
            ? "border-white/12 bg-white/6 focus-within:border-white/40"
            : "border-line bg-surface focus-within:border-ink focus-within:shadow-[0_0_0_4px_rgba(14,17,20,.08)]",
        )}
      >
        <label htmlFor={inputId} className="sr-only">
          Work email
        </label>
        <input
          ref={inputRef}
          id={inputId}
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            "min-w-0 flex-[1_1_200px] rounded-[10px] bg-transparent px-3.5 outline-none",
            dark ? "h-[46px] text-[15px] text-white placeholder:text-[#8A9199]" : "h-10 text-sm text-ink",
          )}
        />
        {/* Hidden from people; spam bots fill it in and get ignored. */}
        <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
          <label>
            Company
            <input
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={trap}
              onChange={(e) => setTrap(e.target.value)}
            />
          </label>
        </div>
        <button
          type="submit"
          disabled={state === "sending"}
          className={cn(
            "press flex-[0_0_auto] cursor-pointer rounded-[10px] font-medium disabled:cursor-progress disabled:opacity-80",
            dark ? "h-[46px] bg-white px-5 text-[15px] text-ink" : "h-10 bg-ink px-4 text-sm text-white",
          )}
        >
          {state === "sending" ? "Joining" : "Join waitlist"}
        </button>
      </form>
      {error && (
        <p
          id={errorId}
          role="alert"
          className={cn("row-in mt-2.5 ml-1 text-[13.5px]", dark ? "text-[#F0B49A]" : "text-fail")}
        >
          {error}
        </p>
      )}
    </div>
  );
}
