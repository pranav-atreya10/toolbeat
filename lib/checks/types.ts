/** The six steps of a check, in the order they run. */
export type StepId = "resolve" | "connect" | "handshake" | "auth" | "tools" | "quality";

export type StepStatus = "pass" | "warn" | "fail" | "skip";

/** Overall verdict. "rate_limited" means the server asked us to slow down (HTTP 429). */
export type CheckVerdict = "pass" | "warn" | "fail" | "rate_limited";

export interface StepResult {
  id: StepId;
  /** Short title shown in the UI, e.g. "Secure connection". */
  name: string;
  status: StepStatus;
  /** How long the step took, or null if it didn't run. */
  latencyMs: number | null;
  /** A short technical note shown on the right, e.g. "41 ms" or "200 text/html". */
  meta: string;
  /** One plain-English sentence saying what happened. */
  message: string;
  /** What to do about it (only for failures and warnings). */
  hint?: string;
  /** Stable code for this outcome, e.g. "NOT_FOUND_404". Used to link to the docs. */
  code?: string;
}

export interface CheckResult {
  url: string;
  verdict: CheckVerdict;
  /** Plain-English headline for the whole check. */
  summary: string;
  /** Which version of MCP the server spoke, if we got that far. */
  protocol?: {
    era: "modern" | "legacy" | "sse";
    version?: string;
  };
  server?: { name?: string; version?: string };
  toolCount?: number;
  steps: StepResult[];
  totalMs: number;
  checkedAt: string;
}

export interface CheckOptions {
  /**
   * Allow private/internal addresses like localhost.
   * ONLY for tests. The public checker must never set this.
   */
  allowPrivateAddresses?: boolean;
  /** Allow plain http:// URLs. ONLY for tests. */
  allowHttp?: boolean;
  /** Per-request timeout in ms (default 12s). */
  requestTimeoutMs?: number;
  /** Whole-check time budget in ms (default 30s). */
  totalTimeoutMs?: number;
}
