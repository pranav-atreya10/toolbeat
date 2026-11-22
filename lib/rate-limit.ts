/**
 * Rate limiting for the free public checker.
 *
 * - In production we use Upstash Redis (set UPSTASH_REDIS_REST_URL and
 *   UPSTASH_REDIS_REST_TOKEN), so limits are shared across all servers.
 * - Without those variables (e.g. on your laptop) we fall back to a simple
 *   in-memory counter, which is fine for local testing.
 */
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export const LIMITS = {
  /** Checks per visitor IP address per hour. */
  perIp: 10,
  /** Checks against the same target host per hour (from everyone combined). */
  perHost: 30,
} as const;

const WINDOW_MS = 60 * 60 * 1000;

export interface LimitResult {
  ok: boolean;
  /** Seconds until the visitor can try again. */
  retryAfter: number;
  remaining: number;
  which?: "ip" | "host";
}

let redis: Redis | null | undefined;
export function getRedis(): Redis | null {
  if (redis === undefined) {
    redis =
      process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
        ? Redis.fromEnv()
        : null;
  }
  return redis;
}

let ipLimiter: Ratelimit | null = null;
let hostLimiter: Ratelimit | null = null;

function upstashLimiters() {
  const r = getRedis();
  if (!r) return null;
  ipLimiter ??= new Ratelimit({
    redis: r,
    limiter: Ratelimit.slidingWindow(LIMITS.perIp, "1 h"),
    prefix: "tb:rl:ip",
  });
  hostLimiter ??= new Ratelimit({
    redis: r,
    limiter: Ratelimit.slidingWindow(LIMITS.perHost, "1 h"),
    prefix: "tb:rl:host",
  });
  return { ipLimiter, hostLimiter };
}

// ── In-memory fallback ──────────────────────────────────────────────
const memory = new Map<string, number[]>();

function memoryLimit(key: string, max: number): LimitResult {
  const now = Date.now();
  const hits = (memory.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (hits.length >= max) {
    memory.set(key, hits);
    return { ok: false, remaining: 0, retryAfter: Math.ceil((hits[0] + WINDOW_MS - now) / 1000) };
  }
  hits.push(now);
  memory.set(key, hits);
  // Keep memory from growing forever.
  if (memory.size > 10_000) memory.clear();
  return { ok: true, remaining: max - hits.length, retryAfter: 0 };
}

/** Check (and count) one request from `ip` against `host`. */
export async function checkRateLimit(ip: string, host: string): Promise<LimitResult> {
  const up = upstashLimiters();
  if (up) {
    const byIp = await up.ipLimiter.limit(ip);
    if (!byIp.success) {
      return { ok: false, remaining: 0, retryAfter: secondsUntil(byIp.reset), which: "ip" };
    }
    const byHost = await up.hostLimiter.limit(host);
    if (!byHost.success) {
      return { ok: false, remaining: 0, retryAfter: secondsUntil(byHost.reset), which: "host" };
    }
    return { ok: true, remaining: byIp.remaining, retryAfter: 0 };
  }
  const byIp = memoryLimit(`ip:${ip}`, LIMITS.perIp);
  if (!byIp.ok) return { ...byIp, which: "ip" };
  const byHost = memoryLimit(`host:${host}`, LIMITS.perHost);
  if (!byHost.ok) return { ...byHost, which: "host" };
  return byIp;
}

function secondsUntil(resetMs: number) {
  return Math.max(1, Math.ceil((resetMs - Date.now()) / 1000));
}

/** Get the visitor's IP address from the request headers (Vercel sets these). */
export function clientIp(headers: Headers): string {
  const fwd = headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return headers.get("x-real-ip") ?? "unknown";
}

/** For tests: forget all in-memory counts. */
export function resetMemoryLimits() {
  memory.clear();
}
