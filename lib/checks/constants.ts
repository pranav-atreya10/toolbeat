/** Every request Toolbeat sends uses this User-Agent, so server owners can recognise us. */
export const USER_AGENT = "ToolbeatBot/0.1 (+https://toolbeat.tech/bot)";

export const CLIENT_INFO = { name: "toolbeat", version: "0.1" } as const;

/**
 * MCP protocol versions.
 * - MODERN: the stateless spec (no initialize handshake), released 2026-07-28.
 * - LEGACY: the previous spec, which starts with an `initialize` handshake.
 * Update these when a new MCP spec ships.
 */
export const MODERN_PROTOCOL_VERSION = "2026-07-28";
export const LEGACY_PROTOCOL_VERSION = "2025-11-25";
/** Versions we know how to speak with the modern (stateless) style. */
export const MODERN_VERSIONS = [MODERN_PROTOCOL_VERSION];

/** Modern-only JSON-RPC error codes (from the 2026-07-28 schema). */
export const ERR_HEADER_MISMATCH = -32020;
export const ERR_MISSING_CLIENT_CAPABILITY = -32021;
export const ERR_UNSUPPORTED_PROTOCOL_VERSION = -32022;

export const REQUEST_TIMEOUT_MS = 12_000;
export const TOTAL_TIMEOUT_MS = 30_000;
/** Never read more than this much of a response body. */
export const MAX_BODY_BYTES = 64 * 1024;
/** Warn when the TLS certificate expires within this many days. */
export const CERT_WARN_DAYS = 14;
/** A tool description shorter than this counts as missing. */
export const MIN_DESCRIPTION_LENGTH = 10;
