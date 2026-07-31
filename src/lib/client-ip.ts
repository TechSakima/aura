/** Loose IPv4 / IPv6 check — reject header garbage for rate-limit keys. */
function looksLikeIp(value: string): boolean {
  if (!value || value.length > 45) return false;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(value)) return true;
  // IPv6 (incl. compressed / IPv4-mapped)
  if (value.includes(":") && /^[0-9a-fA-F:.]+$/.test(value)) return true;
  return false;
}

/**
 * Client IP for rate limits (AURA-270 / AURA-414).
 * Prefer platform-set identity — never the leftmost spoofable XFF hop.
 * Order: CF-Connecting-IP → rightmost X-Forwarded-For → X-Real-IP → local.
 */
export function clientIp(req: Request): string {
  const cf = req.headers.get("cf-connecting-ip")?.trim();
  if (cf && looksLikeIp(cf)) return cf;

  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const parts = xff
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    for (let i = parts.length - 1; i >= 0; i--) {
      const part = parts[i]!;
      if (looksLikeIp(part)) return part;
    }
  }

  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp && looksLikeIp(realIp)) return realIp;

  return "local";
}
