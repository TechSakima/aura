/**
 * Origin / Referer allowlist for admin cookie mutations (AURA-415).
 * Defense-in-depth beyond SameSite=Lax — Edge-safe (no Firebase).
 */

function parseOrigin(raw: string | undefined | null): string | null {
  if (!raw?.trim()) return null;
  try {
    return new URL(raw.trim()).origin;
  } catch {
    return null;
  }
}

/** Extra comma-separated origins (preview hosts, firebaseapp.com, etc.). */
export function allowedAdminOrigins(): string[] {
  const set = new Set<string>();
  for (const raw of [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.APP_URL,
    ...(process.env.AURA_ADMIN_ORIGINS || "").split(","),
  ]) {
    const origin = parseOrigin(raw);
    if (origin) set.add(origin);
  }
  return [...set];
}

/**
 * Default: on in production when APP URL is set.
 * Force on: AURA_ADMIN_ORIGIN_CHECK=1 · force off: =0
 */
export function adminOriginCheckEnabled(): boolean {
  const flag = process.env.AURA_ADMIN_ORIGIN_CHECK?.trim().toLowerCase();
  if (flag === "0" || flag === "false" || flag === "off") return false;
  if (flag === "1" || flag === "true" || flag === "on") return true;
  if (process.env.NODE_ENV !== "production") return false;
  return allowedAdminOrigins().length > 0;
}

/** True when this request should run the admin mutation origin check. */
export function shouldCheckAdminMutationOrigin(
  method: string,
  pathname: string,
): boolean {
  const m = method.toUpperCase();
  if (m !== "POST" && m !== "PUT" && m !== "PATCH" && m !== "DELETE") {
    return false;
  }
  if (!pathname.startsWith("/api/")) return false;
  if (pathname.startsWith("/api/public/")) return false;
  if (pathname.startsWith("/api/auth/")) return false;
  if (pathname.startsWith("/api/webhooks/")) return false;
  if (pathname.startsWith("/api/csp-report")) return false;
  if (pathname.startsWith("/api/cron")) return false;
  // Google OAuth redirect (GET usually; skip mutations for safety).
  if (pathname.startsWith("/api/integrations/google/callback")) return false;
  return true;
}

/**
 * @returns true if the request origin is allowed (or check disabled).
 */
export function adminMutationOriginAllowed(req: {
  headers: Headers;
}): boolean {
  if (!adminOriginCheckEnabled()) return true;
  const allowed = allowedAdminOrigins();
  if (!allowed.length) return true;

  const originHeader = req.headers.get("origin")?.trim();
  if (originHeader) {
    return allowed.includes(originHeader);
  }

  const referer = req.headers.get("referer");
  if (referer) {
    const refOrigin = parseOrigin(referer);
    return Boolean(refOrigin && allowed.includes(refOrigin));
  }

  // Same-origin fetch sends Origin; missing both → reject when check is on.
  return false;
}
