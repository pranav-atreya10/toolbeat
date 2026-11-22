/**
 * runCheck(url): run every step against one MCP endpoint, in order,
 * stopping early when a later step can't run.
 */
import { createHttpClient } from "./http";
import { REQUEST_TIMEOUT_MS, TOTAL_TIMEOUT_MS } from "./constants";
import { describe, type MessageCode } from "./messages";
import {
  authStep,
  connectStep,
  handshakeStep,
  makeStep,
  qualityStep,
  resolveStep,
  skipped,
  toolsStep,
  type StepContext,
} from "./steps";
import type { CheckOptions, CheckResult, CheckVerdict, StepResult } from "./types";

const NEEDS_HANDSHAKE = "Needs a working handshake first.";

/** Check the URL itself before sending anything. Returns an error code, or the parsed URL. */
export function validateUrl(
  input: string,
  { allowHttp = false } = {},
): { ok: true; url: URL } | { ok: false; code: MessageCode } {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return { ok: false, code: "INVALID_URL" };
  }
  if (url.protocol !== "https:" && !(allowHttp && url.protocol === "http:")) {
    return { ok: false, code: url.protocol === "http:" ? "NOT_HTTPS" : "INVALID_URL" };
  }
  if (!url.hostname) return { ok: false, code: "INVALID_URL" };
  if (url.username || url.password) return { ok: false, code: "URL_HAS_CREDENTIALS" };
  if (url.port) {
    const port = Number(url.port);
    if (port !== 443 && port < 1024 && !allowHttp) return { ok: false, code: "BLOCKED_PORT" };
  }
  url.hash = "";
  return { ok: true, url };
}

export async function runCheck(input: string, options: CheckOptions = {}): Promise<CheckResult> {
  const started = performance.now();
  const checkedAt = new Date().toISOString();
  const requestTimeoutMs = options.requestTimeoutMs ?? REQUEST_TIMEOUT_MS;
  const totalTimeoutMs = options.totalTimeoutMs ?? TOTAL_TIMEOUT_MS;

  const valid = validateUrl(input, { allowHttp: options.allowHttp });
  if (!valid.ok) {
    const step = makeStep("resolve", "fail", valid.code, {}, null, "invalid");
    return finish(input, [step], started, checkedAt);
  }
  const url = valid.url;

  const deadline = AbortSignal.timeout(totalTimeoutMs);
  const http = createHttpClient({
    allowPrivate: !!options.allowPrivateAddresses,
    connectTimeoutMs: requestTimeoutMs,
  });
  const ctx: StepContext = {
    url,
    http,
    allowPrivate: !!options.allowPrivateAddresses,
    requestTimeoutMs,
    signal: () => AbortSignal.any([deadline, AbortSignal.timeout(requestTimeoutMs)]),
  };

  const steps: StepResult[] = [];
  const extra: Partial<CheckResult> = {};

  try {
    // 1. Resolve
    const resolved = await resolveStep(ctx);
    steps.push(resolved);
    if (resolved.status === "fail") {
      steps.push(
        skipped("connect", "Needs a domain that resolves first."),
        skipped("handshake", "Needs a connection first."),
        skipped("auth", NEEDS_HANDSHAKE),
        skipped("tools", NEEDS_HANDSHAKE),
      );
      return finish(url.toString(), steps, started, checkedAt);
    }

    // 2. Connect
    const connected = await connectStep(ctx);
    steps.push(connected);
    if (connected.status === "fail") {
      steps.push(
        skipped("handshake", "Needs a secure connection first."),
        skipped("auth", NEEDS_HANDSHAKE),
        skipped("tools", NEEDS_HANDSHAKE),
      );
      return finish(url.toString(), steps, started, checkedAt);
    }

    // 3. Handshake
    const hs = await handshakeStep(ctx);
    steps.push(hs.step);

    switch (hs.kind) {
      case "fail":
      case "rate_limited":
        steps.push(skipped("auth", NEEDS_HANDSHAKE), skipped("tools", NEEDS_HANDSHAKE));
        break;

      case "sse":
        extra.protocol = { era: "sse" };
        steps.push(
          skipped("auth", "Not needed: the server didn't ask for sign-in."),
          skipped("tools", "Not checked for the deprecated SSE transport."),
        );
        break;

      case "auth": {
        // 4. Sign-in (only when the server asked for it)
        steps.push(await authStep(ctx, hs.response));
        steps.push(skipped("tools", "Needs sign-in. Toolbeat doesn't sign in, so tools aren't listed."));
        break;
      }

      case "ok": {
        extra.protocol = { era: hs.session.era, version: hs.session.version };
        if (hs.session.serverInfo) {
          extra.server = { name: hs.session.serverInfo.name, version: hs.session.serverInfo.version };
        }
        if (hs.redirectedTo) {
          const d = describe("REDIRECTED", { url: hs.redirectedTo });
          hs.step.hint = `${d.message} ${d.hint}`;
        }
        steps.push(skipped("auth", "Not needed: the server didn't ask for sign-in."));

        // 5. Tool list
        const tl = await toolsStep(ctx, hs.session);
        steps.push(tl.step);
        // 6. Tool quality (warnings only)
        if (tl.tools && tl.step.status !== "fail") {
          extra.toolCount = tl.tools.length;
          steps.push(qualityStep(tl.tools));
        } else if (tl.tools) {
          extra.toolCount = tl.tools.length;
        }
        break;
      }
    }
  } finally {
    await http.close();
  }

  return finish(url.toString(), steps, started, checkedAt, extra);
}

function finish(
  url: string,
  steps: StepResult[],
  started: number,
  checkedAt: string,
  extra: Partial<CheckResult> = {},
): CheckResult {
  const verdict = verdictFor(steps);
  return {
    url,
    verdict,
    summary: summaryFor(verdict, steps),
    ...extra,
    steps,
    totalMs: Math.round(performance.now() - started),
    checkedAt,
  };
}

export function verdictFor(steps: StepResult[]): CheckVerdict {
  if (steps.some((s) => s.status === "fail")) return "fail";
  if (steps.some((s) => s.code === "RATE_LIMITED")) return "rate_limited";
  if (steps.some((s) => s.status === "warn")) return "warn";
  return "pass";
}

function summaryFor(verdict: CheckVerdict, steps: StepResult[]): string {
  switch (verdict) {
    case "pass":
      return "AI clients can connect";
    case "warn":
      return "AI clients can connect, with warnings";
    case "rate_limited":
      return "The server asked us to slow down";
    case "fail": {
      const first = steps.find((s) => s.status === "fail");
      if (first?.meta === "invalid") return "Check the URL and try again";
      if (first?.id === "auth") return "AI clients can't sign in";
      if (first?.id === "tools") return "AI clients connect, but can't use the tools";
      return "AI clients can't connect";
    }
  }
}
