/**
 * POST /api/check  { "url": "https://mcp.example.com/mcp" }
 *
 * Runs one public check and returns the step-by-step result.
 * Rate-limited by visitor IP and by target host. Results are not stored;
 * we only keep aggregate pass/warn/fail counts (when Redis is set up).
 */
import { runCheck, validateUrl, describe } from "@/lib/checks";
import { checkRateLimit, clientIp, getRedis, LIMITS } from "@/lib/rate-limit";

// A check can take up to 30 seconds, plus a little overhead.
export const maxDuration = 40;

export async function POST(request: Request) {
  let url: unknown;
  try {
    ({ url } = (await request.json()) as { url?: unknown });
  } catch {
    return Response.json({ error: "Send JSON like { \"url\": \"https://...\" }." }, { status: 400 });
  }
  if (typeof url !== "string" || url.length === 0 || url.length > 2048) {
    return Response.json({ error: "Send a URL to check." }, { status: 400 });
  }

  const valid = validateUrl(url);
  if (!valid.ok) {
    const d = describe(valid.code);
    return Response.json({ error: d.message, hint: d.hint, code: d.code }, { status: 400 });
  }

  const limit = await checkRateLimit(clientIp(request.headers), valid.url.hostname.toLowerCase());
  if (!limit.ok) {
    const error =
      limit.which === "host"
        ? "This server has been checked a lot in the last hour. Try again later."
        : `You've used your ${LIMITS.perIp} free checks for this hour. Try again later, or join the waitlist for monitoring.`;
    return Response.json(
      { error, retryAfter: limit.retryAfter },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  const result = await runCheck(valid.url.toString());

  // Aggregate counts only. Never the URL or the result itself.
  const redis = getRedis();
  if (redis) {
    const day = result.checkedAt.slice(0, 10);
    redis.hincrby(`tb:stats:${day}`, result.verdict, 1).catch(() => {});
  }

  return Response.json(result, {
    headers: { "Cache-Control": "no-store", "X-RateLimit-Remaining": String(limit.remaining) },
  });
}
