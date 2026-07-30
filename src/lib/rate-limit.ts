const buckets = new Map<string, { count: number; resetAt: number }>();

/** Client IP from proxy headers (AURA-270). */
export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}

/** Simple in-memory rate limiter (per-process). */
export function rateLimit(
  key: string,
  limit = 20,
  windowMs = 60_000,
): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  const cur = buckets.get(key);
  if (!cur || cur.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }
  if (cur.count >= limit) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((cur.resetAt - now) / 1000)),
    };
  }
  cur.count += 1;
  return { ok: true };
}
