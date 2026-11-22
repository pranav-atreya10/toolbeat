"use client";

import { useId, useState } from "react";

/** Email sign-up on the dark "Get alerts" panel. */
export function WaitlistForm({ source = "footer" }: { source?: "hero" | "result" | "footer" }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "joined">("idle");
  const [error, setError] = useState<string | null>(null);
  const inputId = useId();
  const errorId = useId();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    setState("sending");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), source }),
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
      <div role="status" className="row-in flex items-center gap-2.5 text-[15px] text-white">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <circle cx="10" cy="10" r="10" fill="#5FD3C1" />
          <path d="M6 10.3 8.6 13 14 7" stroke="#0E1114" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span>You’re on the list. We’ll email {email.trim()} when early access opens.</span>
      </div>
    );
  }

  return (
    <div>
      <form
        onSubmit={onSubmit}
        noValidate
        className="flex flex-wrap gap-2 rounded-[14px] border border-white/12 bg-white/6 p-1.5 transition-[border-color] duration-150 focus-within:border-white/40"
      >
        <label htmlFor={inputId} className="sr-only">
          Work email
        </label>
        <input
          id={inputId}
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          className="h-[46px] min-w-0 flex-[1_1_200px] rounded-[10px] bg-transparent px-3.5 text-[15px] text-white outline-none placeholder:text-[#8A9199]"
        />
        <button
          type="submit"
          disabled={state === "sending"}
          className="press h-[46px] flex-[0_0_auto] cursor-pointer rounded-[10px] bg-white px-5 text-[15px] font-medium text-ink disabled:cursor-progress disabled:opacity-80"
        >
          {state === "sending" ? "Joining" : "Join waitlist"}
        </button>
      </form>
      {error && (
        <p id={errorId} role="alert" className="row-in mt-3 ml-1 text-[13.5px] text-[#F0B49A]">
          {error}
        </p>
      )}
    </div>
  );
}
