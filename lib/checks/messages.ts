/**
 * Plain-English messages for every check outcome.
 *
 * Copy rules (docs/PRODUCT.md): plain language, sentence case, active voice.
 * Say what happened and how to fix it. Never vague, never apologizing.
 *
 * The docs pages read this same list, so the website always matches what
 * the checker actually says.
 */
import type { StepId, StepStatus } from "./types";

export interface MessageContext {
  status?: number;
  host?: string;
  url?: string;
  detail?: string;
  names?: string[];
  count?: number;
  days?: number;
  versions?: string[];
}

export interface MessageDef {
  step: StepId;
  /** How this outcome shows up: a failure, a warning, or a pass. */
  severity: Extract<StepStatus, "pass" | "warn" | "fail"> | "info";
  /** Short label used in the docs. */
  title: string;
  message: (c: MessageContext) => string;
  hint?: (c: MessageContext) => string;
}

const list = (names: string[] = [], max = 3) => {
  const shown = names.slice(0, max).map((n) => `"${n}"`);
  const more = names.length > max ? ` and ${names.length - max} more` : "";
  return shown.join(", ") + more;
};

export const MESSAGES = {
  // ── Before we start ──────────────────────────────────────────────
  INVALID_URL: {
    step: "resolve",
    severity: "fail",
    title: "Not a valid URL",
    message: () => "That isn't a valid web address.",
    hint: () => "Paste the full URL of your MCP endpoint, like https://mcp.yourcompany.com/mcp.",
  },
  NOT_HTTPS: {
    step: "resolve",
    severity: "fail",
    title: "Not HTTPS",
    message: () => "The URL doesn't use HTTPS.",
    hint: () =>
      "AI clients expect remote MCP servers on HTTPS. Use an https:// address with a valid certificate.",
  },
  URL_HAS_CREDENTIALS: {
    step: "resolve",
    severity: "fail",
    title: "Password in the URL",
    message: () => "The URL contains a username or password.",
    hint: () => "Remove the credentials from the URL. Never share secrets in a public checker.",
  },
  BLOCKED_PORT: {
    step: "resolve",
    severity: "fail",
    title: "Port not allowed",
    message: () => "Toolbeat doesn't check servers on that port.",
    hint: () => "Use port 443 (the HTTPS default) or a port above 1023.",
  },

  // ── Step 1: Resolve ──────────────────────────────────────────────
  RESOLVE_OK: {
    step: "resolve",
    severity: "pass",
    title: "Domain resolves",
    message: () => "The domain points to a live server.",
  },
  DNS_NOT_FOUND: {
    step: "resolve",
    severity: "fail",
    title: "Domain doesn't resolve (ENOTFOUND)",
    message: () => "The domain doesn't resolve, so nothing can connect.",
    hint: (c) => `Check the DNS record for ${c.host ?? "this host"}. It may be missing, misspelled or expired.`,
  },
  DNS_TEMPORARY: {
    step: "resolve",
    severity: "fail",
    title: "DNS lookup failed",
    message: () => "The DNS lookup failed or timed out.",
    hint: () => "Your DNS provider may be having trouble. Check the record and try again in a minute.",
  },
  BLOCKED_ADDRESS: {
    step: "resolve",
    severity: "fail",
    title: "Private address",
    message: (c) => `The domain points to a private address (${c.detail ?? "internal network"}).`,
    hint: () =>
      "AI clients on the internet can't reach private addresses. Point the domain at a public IP. Toolbeat never connects to private networks.",
  },

  // ── Step 2: Connect ──────────────────────────────────────────────
  CONNECT_OK: {
    step: "connect",
    severity: "pass",
    title: "Secure connection works",
    message: () => "TLS certificate matches the domain.",
  },
  CERT_EXPIRING: {
    step: "connect",
    severity: "warn",
    title: "Certificate expires soon",
    message: (c) => `The TLS certificate expires in ${c.days} day${c.days === 1 ? "" : "s"}.`,
    hint: () => "Renew the certificate before it expires, or every client will refuse to connect.",
  },
  CONNECT_REFUSED: {
    step: "connect",
    severity: "fail",
    title: "Connection refused (ECONNREFUSED)",
    message: () => "The server refused the connection.",
    hint: () => "Nothing is listening on this port. Check that your server is running and the port is open.",
  },
  CONNECT_TIMEOUT: {
    step: "connect",
    severity: "fail",
    title: "Connection timed out",
    message: () => "The server didn't answer the connection in time.",
    hint: () => "A firewall may be dropping traffic, or the server is down. Check that the host is up and port 443 is open.",
  },
  CONNECT_RESET: {
    step: "connect",
    severity: "fail",
    title: "Connection reset",
    message: () => "The server closed the connection right away.",
    hint: () => "This often means a proxy or firewall is cutting the connection. Check your load balancer logs.",
  },
  UNREACHABLE: {
    step: "connect",
    severity: "fail",
    title: "Host unreachable",
    message: () => "The network can't reach this server.",
    hint: () => "Check that the server has a public IP and that routing and firewalls allow traffic.",
  },
  TLS_EXPIRED: {
    step: "connect",
    severity: "fail",
    title: "Certificate expired",
    message: () => "The TLS certificate has expired.",
    hint: () => "Renew the certificate. Clients refuse to connect until you do.",
  },
  TLS_NAME_MISMATCH: {
    step: "connect",
    severity: "fail",
    title: "Certificate doesn't match the domain",
    message: (c) => `The TLS certificate isn't valid for ${c.host ?? "this domain"}.`,
    hint: () => "Issue a certificate that includes this exact hostname.",
  },
  TLS_SELF_SIGNED: {
    step: "connect",
    severity: "fail",
    title: "Self-signed certificate",
    message: () => "The server uses a self-signed certificate.",
    hint: () => "Clients only trust certificates from a public authority. Get a free one from Let's Encrypt.",
  },
  TLS_UNTRUSTED: {
    step: "connect",
    severity: "fail",
    title: "Certificate not trusted",
    message: () => "The TLS certificate chain isn't trusted.",
    hint: () => "Make sure your server sends the full certificate chain, including intermediate certificates.",
  },
  TLS_ERROR: {
    step: "connect",
    severity: "fail",
    title: "TLS error",
    message: (c) => `The secure connection failed${c.detail ? ` (${c.detail})` : ""}.`,
    hint: () => "Check your TLS setup. Clients need TLS 1.2 or newer and a valid certificate.",
  },

  // ── Step 3: Handshake ────────────────────────────────────────────
  HANDSHAKE_OK_MODERN: {
    step: "handshake",
    severity: "pass",
    title: "Handshake works (current spec)",
    message: (c) => `The server answered discovery on MCP ${c.detail ?? ""}.`.replace(" .", "."),
  },
  HANDSHAKE_OK_LEGACY: {
    step: "handshake",
    severity: "pass",
    title: "Handshake works (previous spec)",
    message: (c) => `The server answered the initialize handshake on MCP ${c.detail ?? ""}.`.replace(" .", "."),
  },
  HANDSHAKE_AUTH_REQUIRED: {
    step: "handshake",
    severity: "pass",
    title: "Sign-in required",
    message: (c) => `The server asks clients to sign in first (${c.status}).`,
  },
  HANDSHAKE_TIMEOUT: {
    step: "handshake",
    severity: "fail",
    title: "Handshake timed out",
    message: () => "The server accepted the connection but never answered the MCP request.",
    hint: () => "Your MCP handler may be stuck or waiting on something slow. Check its logs and make sure it replies within a few seconds.",
  },
  HANDSHAKE_NETWORK: {
    step: "handshake",
    severity: "fail",
    title: "Connection dropped during handshake",
    message: (c) => `The connection broke while sending the MCP request${c.detail ? ` (${c.detail})` : ""}.`,
    hint: () => "Check your server and proxy logs for crashes or dropped requests.",
  },
  NOT_FOUND_404: {
    step: "handshake",
    severity: "fail",
    title: "404 Not Found",
    message: () => "The endpoint returned 404.",
    hint: () => "Check the URL path, usually /mcp. Make sure your MCP handler is mounted at this exact path.",
  },
  METHOD_NOT_ALLOWED_405: {
    step: "handshake",
    severity: "fail",
    title: "405 Method Not Allowed",
    message: () => "The endpoint doesn't accept POST requests.",
    hint: () => "MCP clients send requests with POST. Make sure this path routes POST to your MCP handler.",
  },
  BAD_REQUEST_400: {
    step: "handshake",
    severity: "fail",
    title: "400 Bad Request",
    message: (c) => `The server rejected the MCP request as invalid${c.detail ? `: "${c.detail}"` : ""}.`,
    hint: () => "Check that your server supports MCP over Streamable HTTP and accepts the current or previous protocol version.",
  },
  GONE_410: {
    step: "handshake",
    severity: "fail",
    title: "410 Gone",
    message: () => "The endpoint says it has been removed (410).",
    hint: () => "If the server moved, update the URL everywhere you've published it, including the MCP Registry.",
  },
  CLOUDFLARE_530: {
    step: "handshake",
    severity: "fail",
    title: "Cloudflare 530",
    message: () => "Cloudflare can't reach your server.",
    hint: () => "The server or tunnel behind Cloudflare is probably offline. Check your origin server or cloudflared tunnel.",
  },
  CLOUDFLARE_52X: {
    step: "handshake",
    severity: "fail",
    title: "Cloudflare 52x",
    message: (c) => `Cloudflare got a bad answer from your server (${c.status}).`,
    hint: () => "Your origin server is down, timing out or refusing Cloudflare. Check that it's running and reachable.",
  },
  SERVER_ERROR_5XX: {
    step: "handshake",
    severity: "fail",
    title: "Server error (5xx)",
    message: (c) => `The server crashed or failed while handling the request (${c.status}).`,
    hint: () => "Check your server logs for an error around the time of this check.",
  },
  FIREWALL_BLOCKED: {
    step: "handshake",
    severity: "fail",
    title: "Blocked by a firewall",
    message: () => "A firewall or bot filter blocked the request with a challenge page.",
    hint: () => "AI clients can't solve browser challenges. Allow automated traffic to your MCP path in your firewall or bot-protection settings.",
  },
  HTML_RESPONSE: {
    step: "handshake",
    severity: "fail",
    title: "Got a web page instead of MCP",
    message: () => "Got a regular web page instead of an MCP response.",
    hint: () => "Make sure this path routes to your MCP handler, not your website or a login page.",
  },
  NOT_JSONRPC: {
    step: "handshake",
    severity: "fail",
    title: "Response isn't JSON-RPC",
    message: (c) => `The server answered (${c.status}), but not with an MCP (JSON-RPC) message.`,
    hint: () => "MCP replies must be JSON-RPC, sent as JSON or as an event stream. Check that this path goes to your MCP handler.",
  },
  INIT_ERROR: {
    step: "handshake",
    severity: "fail",
    title: "Handshake returned an error",
    message: (c) => `The server rejected the handshake${c.detail ? `: "${c.detail}"` : ""}.`,
    hint: () => "Check that your server accepts the current (2026-07-28) or previous (2025-11-25) MCP version.",
  },
  UNSUPPORTED_VERSION: {
    step: "handshake",
    severity: "fail",
    title: "No shared protocol version",
    message: (c) =>
      `The server only supports MCP ${c.versions?.length ? c.versions.join(", ") : "versions we don't recognise"}.`,
    hint: () => "Support the current (2026-07-28) or previous (2025-11-25) version so today's AI clients can connect.",
  },
  MODERN_REJECTED: {
    step: "handshake",
    severity: "fail",
    title: "Request rejected by a current-spec server",
    message: (c) => `The server speaks the current MCP spec but rejected the request${c.detail ? `: "${c.detail}"` : ""}.`,
    hint: () => "Check that your server reads protocol details from the request _meta and the MCP-Protocol-Version header.",
  },
  SSE_DEPRECATED: {
    step: "handshake",
    severity: "warn",
    title: "Uses the deprecated SSE transport",
    message: () => "Uses the deprecated SSE transport.",
    hint: () => "This works for now, but clients are dropping it. Move to Streamable HTTP.",
  },
  REDIRECTED: {
    step: "handshake",
    severity: "info",
    title: "Redirects to another URL",
    message: (c) => `The request was redirected to ${c.url}.`,
    hint: () => "Some clients don't follow redirects for POST. Publish the final URL instead.",
  },
  RATE_LIMITED: {
    step: "handshake",
    severity: "warn",
    title: "Rate limited (429)",
    message: () => "The server asked us to slow down (429), so we couldn't finish the check.",
    hint: () => "This isn't a failure. Try again in a few minutes.",
  },

  // ── Step 4: Sign-in (OAuth) ──────────────────────────────────────
  AUTH_OK: {
    step: "auth",
    severity: "pass",
    title: "Sign-in details are correct",
    message: () => "Clients get the sign-in details they need to start OAuth.",
  },
  AUTH_NO_WWW_AUTHENTICATE: {
    step: "auth",
    severity: "fail",
    title: "401 without WWW-Authenticate",
    message: () => "Your server requires sign-in but doesn't tell clients how.",
    hint: () => "Add a WWW-Authenticate header pointing to your protected resource metadata.",
  },
  AUTH_NO_METADATA: {
    step: "auth",
    severity: "fail",
    title: "Missing protected resource metadata",
    message: () => "Clients can't find where to sign in.",
    hint: () =>
      "Serve /.well-known/oauth-protected-resource with an authorization_servers list, and link to it from the WWW-Authenticate header.",
  },
  AUTH_FORBIDDEN: {
    step: "auth",
    severity: "fail",
    title: "403 Forbidden",
    message: () => "The server refused the request outright (403) without offering a way to sign in.",
    hint: () => "Return 401 with a WWW-Authenticate header for unauthenticated clients, so they can start OAuth.",
  },

  // ── Step 5: Tool list ────────────────────────────────────────────
  TOOLS_OK: {
    step: "tools",
    severity: "pass",
    title: "Tool list is valid",
    message: (c) => `Listed ${c.count} tool${c.count === 1 ? "" : "s"}, all with valid input schemas.`,
  },
  TOOLS_NOT_OFFERED: {
    step: "tools",
    severity: "info",
    title: "Server doesn't offer tools",
    message: () => "This server doesn't offer tools, so there's nothing to list.",
  },
  TOOLS_ERROR: {
    step: "tools",
    severity: "fail",
    title: "tools/list failed",
    message: (c) => `The handshake worked, but listing tools failed${c.detail ? `: "${c.detail}"` : ""}.`,
    hint: () => "Check your tools/list handler. If you use sessions, make sure the Mcp-Session-Id from the handshake is accepted.",
  },
  TOOLS_INVALID_SCHEMA: {
    step: "tools",
    severity: "fail",
    title: "Invalid tool schemas",
    message: (c) => `Some tools have an invalid input schema: ${list(c.names)}.`,
    hint: () => 'Every tool needs an inputSchema with "type": "object", even if it takes no arguments.',
  },

  // ── Step 6: Tool quality ─────────────────────────────────────────
  QUALITY_OK: {
    step: "quality",
    severity: "pass",
    title: "Tools are described",
    message: () => "Every tool has a description.",
  },
  QUALITY_MISSING_DESCRIPTIONS: {
    step: "quality",
    severity: "warn",
    title: "Missing tool descriptions",
    message: (c) => `${c.count} tool${c.count === 1 ? " has" : "s have"} no useful description: ${list(c.names)}.`,
    hint: () => "AI models pick tools by reading their descriptions. Write a sentence or two saying what each tool does and when to use it.",
  },
  QUALITY_ZERO_TOOLS: {
    step: "quality",
    severity: "warn",
    title: "Zero tools",
    message: () => "The server lists no tools.",
    hint: () => "If that's unexpected, check that tools are registered before the server starts.",
  },
} satisfies Record<string, MessageDef>;

export type MessageCode = keyof typeof MESSAGES;

/** Get the message (and fix hint) for a code. */
export function describe(code: MessageCode, ctx: MessageContext = {}) {
  const def: MessageDef = MESSAGES[code];
  return {
    code,
    message: def.message(ctx),
    hint: def.hint?.(ctx),
  };
}

/** Map a Node/undici network error code to one of our message codes. */
export function codeForNetworkError(errCode: string, phase: "resolve" | "connect" | "handshake"): MessageCode {
  switch (errCode) {
    case "ENOTFOUND":
    case "ENODATA":
      return "DNS_NOT_FOUND";
    case "EAI_AGAIN":
    case "ESERVFAIL":
    case "ETIMEOUT":
      return "DNS_TEMPORARY";
    case "EBLOCKED":
      return "BLOCKED_ADDRESS";
    case "ECONNREFUSED":
      return "CONNECT_REFUSED";
    case "ECONNRESET":
    case "EPIPE":
    case "UND_ERR_SOCKET":
      return phase === "handshake" ? "HANDSHAKE_NETWORK" : "CONNECT_RESET";
    case "EHOSTUNREACH":
    case "ENETUNREACH":
      return "UNREACHABLE";
    case "TIMEOUT":
    case "ETIMEDOUT":
    case "UND_ERR_HEADERS_TIMEOUT":
    case "UND_ERR_BODY_TIMEOUT":
      return phase === "handshake" ? "HANDSHAKE_TIMEOUT" : "CONNECT_TIMEOUT";
    case "CERT_HAS_EXPIRED":
      return "TLS_EXPIRED";
    case "ERR_TLS_CERT_ALTNAME_INVALID":
    case "HOSTNAME_MISMATCH":
      return "TLS_NAME_MISMATCH";
    case "DEPTH_ZERO_SELF_SIGNED_CERT":
    case "SELF_SIGNED_CERT_IN_CHAIN":
      return "TLS_SELF_SIGNED";
    case "UNABLE_TO_VERIFY_LEAF_SIGNATURE":
    case "UNABLE_TO_GET_ISSUER_CERT":
    case "UNABLE_TO_GET_ISSUER_CERT_LOCALLY":
    case "CERT_UNTRUSTED":
      return "TLS_UNTRUSTED";
    default:
      if (errCode.startsWith("ERR_SSL") || errCode.startsWith("ERR_TLS") || errCode.includes("CERT")) {
        return "TLS_ERROR";
      }
      return phase === "handshake" ? "HANDSHAKE_NETWORK" : phase === "connect" ? "UNREACHABLE" : "DNS_TEMPORARY";
  }
}

/** Map an HTTP status that ended the handshake to a message code. */
export function codeForHttpStatus(status: number): MessageCode | null {
  if (status === 404) return "NOT_FOUND_404";
  if (status === 405) return "METHOD_NOT_ALLOWED_405";
  if (status === 400) return "BAD_REQUEST_400";
  if (status === 410) return "GONE_410";
  if (status === 530) return "CLOUDFLARE_530";
  if (status >= 520 && status <= 527) return "CLOUDFLARE_52X";
  if (status >= 500) return "SERVER_ERROR_5XX";
  return null;
}
