/**
 * The individual check steps. Each one returns a StepResult (and sometimes
 * extra info the next step needs). See docs/CHECKS.md for the rules.
 *
 * IMPORTANT safety rule: we only send discovery and listing requests.
 * Never `tools/call` or anything that could change data.
 */
import net from "node:net";
import tls from "node:tls";
import { makeSafeLookup, resolvePublic, BlockedAddressError } from "./ssrf";
import { NetworkError, type HttpClient, type HttpResponse } from "./http";
import { hasCompleteReply, looksLikeHtml, parseJsonRpc, type JsonRpcReply } from "./jsonrpc";
import {
  CERT_WARN_DAYS,
  CLIENT_INFO,
  ERR_HEADER_MISMATCH,
  ERR_MISSING_CLIENT_CAPABILITY,
  ERR_UNSUPPORTED_PROTOCOL_VERSION,
  LEGACY_PROTOCOL_VERSION,
  MIN_DESCRIPTION_LENGTH,
  MODERN_PROTOCOL_VERSION,
  MODERN_VERSIONS,
} from "./constants";
import { codeForHttpStatus, codeForNetworkError, describe, type MessageCode, type MessageContext } from "./messages";
import type { StepId, StepResult, StepStatus } from "./types";

export interface StepContext {
  url: URL;
  http: HttpClient;
  allowPrivate: boolean;
  /** Returns a fresh abort signal for one request (per-request + whole-check timeout). */
  signal: () => AbortSignal;
  requestTimeoutMs: number;
}

export const STEP_NAMES: Record<StepId, string> = {
  resolve: "Resolve",
  connect: "Secure connection",
  handshake: "MCP handshake",
  auth: "Sign-in (OAuth)",
  tools: "Tool list",
  quality: "Tool quality",
};

export function stepName(id: StepId, host?: string) {
  return id === "resolve" && host ? `Resolve ${host}` : STEP_NAMES[id];
}

/** Build a StepResult from a message code. */
export function makeStep(
  id: StepId,
  status: StepStatus,
  code: MessageCode,
  ctx: MessageContext,
  latencyMs: number | null,
  meta: string,
  host?: string,
): StepResult {
  const d = describe(code, ctx);
  return {
    id,
    name: stepName(id, host),
    status,
    latencyMs,
    meta,
    message: d.message,
    hint: status === "pass" ? undefined : d.hint,
    code,
  };
}

export function skipped(id: StepId, message: string, host?: string): StepResult {
  return { id, name: stepName(id, host), status: "skip", latencyMs: null, meta: "skipped", message };
}

const ms = (n: number) => `${Math.round(n)} ms`;

// ── Step 1: Resolve ─────────────────────────────────────────────────

export async function resolveStep(ctx: StepContext): Promise<StepResult> {
  const host = ctx.url.hostname;
  const started = performance.now();
  try {
    const addrs = await resolvePublic(host, { allowPrivate: ctx.allowPrivate });
    const t = performance.now() - started;
    return makeStep("resolve", "pass", "RESOLVE_OK", { host, detail: addrs[0]?.address }, Math.round(t), ms(t), host);
  } catch (err) {
    const t = performance.now() - started;
    if (err instanceof BlockedAddressError) {
      return makeStep("resolve", "fail", "BLOCKED_ADDRESS", { host, detail: err.address }, Math.round(t), "private", host);
    }
    const code = (err as { code?: string }).code ?? "ENOTFOUND";
    return makeStep("resolve", "fail", codeForNetworkError(code, "resolve"), { host }, Math.round(t), code, host);
  }
}

// ── Step 2: Connect ─────────────────────────────────────────────────

export async function connectStep(ctx: StepContext): Promise<StepResult> {
  const { url } = ctx;
  const host = url.hostname.replace(/^\[|\]$/g, "");
  const isHttps = url.protocol === "https:";
  const port = Number(url.port || (isHttps ? 443 : 80));
  const lookup = makeSafeLookup({ allowPrivate: ctx.allowPrivate });
  const started = performance.now();

  return new Promise<StepResult>((resolve) => {
    let finished = false;
    const done = (r: StepResult) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      socket.destroy();
      resolve(r);
    };
    const elapsed = () => performance.now() - started;

    const socket: net.Socket = isHttps
      ? tls.connect({
          host,
          port,
          servername: net.isIP(host) ? undefined : host,
          lookup,
          ALPNProtocols: ["http/1.1"],
        })
      : net.connect({ host, port, lookup });

    const timer = setTimeout(() => {
      done(makeStep("connect", "fail", "CONNECT_TIMEOUT", { host }, Math.round(elapsed()), "timeout"));
    }, ctx.requestTimeoutMs);

    socket.once(isHttps ? "secureConnect" : "connect", () => {
      const t = elapsed();
      if (isHttps) {
        const cert = (socket as tls.TLSSocket).getPeerCertificate();
        const validTo = cert?.valid_to ? Date.parse(cert.valid_to) : NaN;
        if (!Number.isNaN(validTo)) {
          const days = Math.floor((validTo - Date.now()) / 86_400_000);
          if (days <= CERT_WARN_DAYS) {
            return done(makeStep("connect", "warn", "CERT_EXPIRING", { days, host }, Math.round(t), `${days}d left`));
          }
        }
      }
      done(makeStep("connect", "pass", "CONNECT_OK", { host }, Math.round(t), ms(t)));
    });

    socket.once("error", (err: NodeJS.ErrnoException) => {
      const code = err.code ?? "TLS_ERROR";
      const mapped = codeForNetworkError(code, "connect");
      done(
        makeStep(
          "connect",
          "fail",
          mapped,
          { host, detail: mapped === "TLS_ERROR" ? code : undefined },
          Math.round(elapsed()),
          code,
        ),
      );
    });
  });
}

// ── Step 3: Handshake ───────────────────────────────────────────────

/** What we learned from a successful handshake, needed for the tool list. */
export type Session =
  | { era: "modern"; version: string; capabilities?: Record<string, unknown>; serverInfo?: ServerInfo }
  | {
      era: "legacy";
      version: string;
      sessionId?: string;
      capabilities?: Record<string, unknown>;
      serverInfo?: ServerInfo;
    };

export interface ServerInfo {
  name?: string;
  version?: string;
}

export type HandshakeOutcome =
  | { kind: "ok"; step: StepResult; session: Session; redirectedTo?: string }
  | { kind: "auth"; step: StepResult; response: HttpResponse }
  | { kind: "sse"; step: StepResult }
  | { kind: "rate_limited"; step: StepResult }
  | { kind: "fail"; step: StepResult };

function modernMeta(version: string) {
  return {
    "io.modelcontextprotocol/protocolVersion": version,
    "io.modelcontextprotocol/clientInfo": CLIENT_INFO,
    "io.modelcontextprotocol/clientCapabilities": {},
  };
}

const BASE_HEADERS = {
  "Content-Type": "application/json",
  Accept: "application/json, text/event-stream",
};

/** Send one JSON-RPC message the way an MCP client would. */
export async function postRpc(
  ctx: StepContext,
  body: Record<string, unknown>,
  session: { era: "modern"; version: string } | { era: "legacy"; version?: string; sessionId?: string },
): Promise<HttpResponse> {
  const headers: Record<string, string> = { ...BASE_HEADERS };
  const method = String(body.method);
  if (session.era === "modern") {
    headers["MCP-Protocol-Version"] = session.version;
    headers["Mcp-Method"] = method;
  } else {
    if (session.version) headers["MCP-Protocol-Version"] = session.version;
    if (session.sessionId) headers["Mcp-Session-Id"] = session.sessionId;
  }
  return ctx.http.request(ctx.url.toString(), {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal: ctx.signal(),
    stopWhen: hasCompleteReply,
  });
}

function metaFor(r: HttpResponse) {
  return `${r.status}${r.contentType ? ` ${r.contentType}` : ""}`;
}

function errorText(reply: JsonRpcReply | null) {
  const m = reply?.error?.message;
  return m ? m.slice(0, 140) : undefined;
}

/** Turn a network error during the handshake into a failed step. */
function handshakeNetworkFail(err: unknown, latency: number): HandshakeOutcome {
  const code = err instanceof NetworkError ? err.code : "NETWORK_ERROR";
  const mapped = codeForNetworkError(code, "handshake");
  return {
    kind: "fail",
    step: makeStep("handshake", "fail", mapped, { detail: code }, latency, code === "TIMEOUT" ? "timeout" : code),
  };
}

export async function handshakeStep(ctx: StepContext): Promise<HandshakeOutcome> {
  const started = performance.now();
  const latency = () => Math.round(performance.now() - started);

  // A) Try the current spec first: a stateless `server/discover` request.
  let r: HttpResponse;
  try {
    r = await postRpc(
      ctx,
      { jsonrpc: "2.0", id: 1, method: "server/discover", params: { _meta: modernMeta(MODERN_PROTOCOL_VERSION) } },
      { era: "modern", version: MODERN_PROTOCOL_VERSION },
    );
  } catch (err) {
    return handshakeNetworkFail(err, latency());
  }

  const early = commonOutcomes(r, latency());
  if (early) return early;

  const reply = parseJsonRpc(r.text);
  if (reply?.result && r.status < 400) {
    const result = reply.result;
    const supported = Array.isArray(result.supportedVersions) ? (result.supportedVersions as string[]) : [];
    const meta = (result._meta ?? {}) as Record<string, unknown>;
    const serverInfo = (meta["io.modelcontextprotocol/serverInfo"] ?? result.serverInfo) as ServerInfo | undefined;
    const version = supported.includes(MODERN_PROTOCOL_VERSION) || supported.length === 0 ? MODERN_PROTOCOL_VERSION : supported[0];
    return {
      kind: "ok",
      step: makeStep("handshake", "pass", "HANDSHAKE_OK_MODERN", { detail: version }, latency(), metaFor(r)),
      session: {
        era: "modern",
        version,
        capabilities: result.capabilities as Record<string, unknown> | undefined,
        serverInfo,
      },
      redirectedTo: r.redirected ? r.url : undefined,
    };
  }

  if (reply?.error) {
    const { code } = reply.error;
    if (code === ERR_UNSUPPORTED_PROTOCOL_VERSION) {
      // A current-spec server that doesn't like our version. See what it does support.
      const data = (reply.error.data ?? {}) as { supported?: unknown };
      const supported = Array.isArray(data.supported) ? (data.supported as string[]) : [];
      const modern = supported.find((v) => MODERN_VERSIONS.includes(v));
      if (!modern && supported.length > 0) {
        // It only supports older (initialize-based) versions. Fall through to legacy.
        return legacyHandshake(ctx, started, supported[0]);
      }
      return {
        kind: "fail",
        step: makeStep("handshake", "fail", "UNSUPPORTED_VERSION", { versions: supported }, latency(), metaFor(r)),
      };
    }
    if (code === ERR_HEADER_MISMATCH || code === ERR_MISSING_CLIENT_CAPABILITY) {
      return {
        kind: "fail",
        step: makeStep("handshake", "fail", "MODERN_REJECTED", { detail: errorText(reply) }, latency(), metaFor(r)),
      };
    }
  }

  // B) Anything else means "not a current-spec server". Fall back to the
  // previous spec's `initialize` handshake, and judge the server on that.
  return legacyHandshake(ctx, started);
}

/** Outcomes that are the same for both spec versions: rate limits and sign-in. */
function commonOutcomes(r: HttpResponse, latency: number): HandshakeOutcome | null {
  if (r.status === 429) {
    return { kind: "rate_limited", step: makeStep("handshake", "warn", "RATE_LIMITED", {}, latency, "429") };
  }
  if (r.status === 401 || r.status === 403) {
    // A 403 challenge page from a bot filter is a different problem from sign-in.
    if (r.status === 403 && looksLikeHtml(r.contentType, r.text) && /cloudflare|captcha|challenge|attention required|access denied/i.test(r.text)) {
      return { kind: "fail", step: makeStep("handshake", "fail", "FIREWALL_BLOCKED", {}, latency, metaFor(r)) };
    }
    return {
      kind: "auth",
      step: makeStep("handshake", "pass", "HANDSHAKE_AUTH_REQUIRED", { status: r.status }, latency, String(r.status)),
      response: r,
    };
  }
  return null;
}

async function legacyHandshake(ctx: StepContext, started: number, version = LEGACY_PROTOCOL_VERSION): Promise<HandshakeOutcome> {
  const latency = () => Math.round(performance.now() - started);
  let r: HttpResponse;
  try {
    r = await postRpc(
      ctx,
      {
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: { protocolVersion: version, capabilities: {}, clientInfo: CLIENT_INFO },
      },
      { era: "legacy" },
    );
  } catch (err) {
    return handshakeNetworkFail(err, latency());
  }

  const early = commonOutcomes(r, latency());
  if (early) return early;

  const reply = parseJsonRpc(r.text);

  if (reply?.result) {
    const result = reply.result;
    const negotiated = typeof result.protocolVersion === "string" ? result.protocolVersion : version;
    return {
      kind: "ok",
      step: makeStep("handshake", "pass", "HANDSHAKE_OK_LEGACY", { detail: negotiated }, latency(), metaFor(r)),
      session: {
        era: "legacy",
        version: negotiated,
        sessionId: r.headers.get("mcp-session-id") ?? undefined,
        capabilities: result.capabilities as Record<string, unknown> | undefined,
        serverInfo: result.serverInfo as ServerInfo | undefined,
      },
      redirectedTo: r.redirected ? r.url : undefined,
    };
  }

  // Not a working handshake. Before failing on 400/404/405, see whether the
  // server only speaks the old, deprecated HTTP+SSE transport.
  if (!reply && [400, 404, 405].includes(r.status)) {
    const sse = await trySseTransport(ctx);
    if (sse) {
      return { kind: "sse", step: makeStep("handshake", "warn", "SSE_DEPRECATED", {}, latency(), "GET text/event-stream") };
    }
  }

  const statusCode = codeForHttpStatus(r.status);
  if (statusCode && !(statusCode === "BAD_REQUEST_400" && reply?.error)) {
    return {
      kind: "fail",
      step: makeStep("handshake", "fail", statusCode, { status: r.status, detail: errorText(reply) }, latency(), metaFor(r)),
    };
  }
  if (reply?.error) {
    return {
      kind: "fail",
      step: makeStep("handshake", "fail", "INIT_ERROR", { detail: errorText(reply) }, latency(), metaFor(r)),
    };
  }
  if (looksLikeHtml(r.contentType, r.text)) {
    return { kind: "fail", step: makeStep("handshake", "fail", "HTML_RESPONSE", {}, latency(), metaFor(r)) };
  }
  return {
    kind: "fail",
    step: makeStep("handshake", "fail", "NOT_JSONRPC", { status: r.status }, latency(), metaFor(r)),
  };
}

/**
 * The deprecated HTTP+SSE transport: a GET opens an event stream whose first
 * event is called "endpoint". We only check that it connects.
 */
async function trySseTransport(ctx: StepContext): Promise<boolean> {
  try {
    const r = await ctx.http.request(ctx.url.toString(), {
      method: "GET",
      headers: { Accept: "text/event-stream" },
      signal: AbortSignal.any([ctx.signal(), AbortSignal.timeout(5_000)]),
      stopWhen: (t) => /event:\s*endpoint/.test(t),
    });
    return r.status === 200 && r.contentType === "text/event-stream";
  } catch {
    return false;
  }
}

// ── Step 4: Sign-in (OAuth) ─────────────────────────────────────────

export async function authStep(ctx: StepContext, response: HttpResponse): Promise<StepResult> {
  const started = performance.now();
  const latency = () => Math.round(performance.now() - started);
  const wa = response.headers.get("www-authenticate") ?? "";

  if (!wa) {
    const code: MessageCode = response.status === 403 ? "AUTH_FORBIDDEN" : "AUTH_NO_WWW_AUTHENTICATE";
    return makeStep("auth", "fail", code, {}, 0, `${response.status}, no header`);
  }

  // Where is the protected resource metadata? Prefer the header's link.
  const base = new URL(response.url || ctx.url.toString());
  const candidates: string[] = [];
  const linked = wa.match(/resource_metadata="([^"]+)"/i)?.[1];
  if (linked) {
    try {
      candidates.push(new URL(linked, base).toString());
    } catch {
      // ignore a broken link; we'll try the standard locations
    }
  }
  const path = base.pathname !== "/" ? base.pathname.replace(/\/$/, "") : "";
  candidates.push(`${base.origin}/.well-known/oauth-protected-resource${path}`);
  candidates.push(`${base.origin}/.well-known/oauth-protected-resource`);

  for (const candidate of [...new Set(candidates)]) {
    try {
      const r = await ctx.http.request(candidate, {
        headers: { Accept: "application/json" },
        signal: ctx.signal(),
      });
      if (r.status !== 200) continue;
      const json = JSON.parse(r.text) as { authorization_servers?: unknown };
      if (Array.isArray(json.authorization_servers) && json.authorization_servers.length > 0) {
        return makeStep("auth", "pass", "AUTH_OK", {}, latency(), "metadata ok");
      }
    } catch {
      // try the next location
    }
  }
  return makeStep("auth", "fail", "AUTH_NO_METADATA", {}, latency(), "no metadata");
}

// ── Step 5 + 6: Tool list and tool quality ──────────────────────────

interface Tool {
  name?: string;
  description?: string;
  inputSchema?: { type?: unknown };
}

export interface ToolsOutcome {
  step: StepResult;
  tools?: Tool[];
}

export async function toolsStep(ctx: StepContext, session: Session): Promise<ToolsOutcome> {
  const started = performance.now();
  const latency = () => Math.round(performance.now() - started);

  // Servers that don't offer tools (e.g. resources only) are fine.
  if (session.capabilities && !("tools" in session.capabilities)) {
    return { step: { ...makeStep("tools", "skip", "TOOLS_NOT_OFFERED", {}, null, "no tools"), status: "skip" } };
  }

  let r: HttpResponse;
  try {
    if (session.era === "modern") {
      r = await postRpc(
        ctx,
        { jsonrpc: "2.0", id: 2, method: "tools/list", params: { _meta: modernMeta(session.version) } },
        session,
      );
    } else {
      // The previous spec needs an "initialized" notification first.
      await postRpc(ctx, { jsonrpc: "2.0", method: "notifications/initialized" }, session).catch(() => null);
      r = await postRpc(ctx, { jsonrpc: "2.0", id: 2, method: "tools/list", params: {} }, session);
    }
  } catch (err) {
    const code = err instanceof NetworkError ? err.code : "NETWORK_ERROR";
    return {
      step: makeStep("tools", "fail", "TOOLS_ERROR", { detail: code === "TIMEOUT" ? "timed out" : code }, latency(), code),
    };
  }

  const reply = parseJsonRpc(r.text);
  const tools = reply?.result?.tools;
  if (!Array.isArray(tools)) {
    return {
      step: makeStep(
        "tools",
        "fail",
        "TOOLS_ERROR",
        { detail: errorText(reply) ?? (reply ? undefined : `HTTP ${r.status}`) },
        latency(),
        metaFor(r),
      ),
    };
  }

  const bad = (tools as Tool[])
    .filter((t) => !t.inputSchema || typeof t.inputSchema !== "object" || t.inputSchema.type !== "object")
    .map((t) => t.name ?? "(unnamed)");
  if (bad.length > 0) {
    return {
      step: makeStep("tools", "fail", "TOOLS_INVALID_SCHEMA", { names: bad, count: bad.length }, latency(), `${tools.length} tools`),
      tools,
    };
  }
  return {
    step: makeStep("tools", "pass", "TOOLS_OK", { count: tools.length }, latency(), `${tools.length} tools`),
    tools,
  };
}

export function qualityStep(tools: Tool[]): StepResult {
  if (tools.length === 0) {
    return makeStep("quality", "warn", "QUALITY_ZERO_TOOLS", {}, 0, "0 tools");
  }
  const noDesc = tools
    .filter((t) => typeof t.description !== "string" || t.description.trim().length < MIN_DESCRIPTION_LENGTH)
    .map((t) => t.name ?? "(unnamed)");
  if (noDesc.length > 0) {
    return makeStep(
      "quality",
      "warn",
      "QUALITY_MISSING_DESCRIPTIONS",
      { names: noDesc, count: noDesc.length },
      0,
      `${noDesc.length} of ${tools.length}`,
    );
  }
  return makeStep("quality", "pass", "QUALITY_OK", {}, 0, `${tools.length} of ${tools.length}`);
}
