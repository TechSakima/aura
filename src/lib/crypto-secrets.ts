/**
 * HMAC / seal secret resolution (AURA-389).
 * Edge-safe (no Node crypto) — usable from middleware + route handlers.
 *
 * Production: never use NEXT_PUBLIC_* or string literals.
 * Development: allow local literals so `next dev` works without secrets.
 */

export function isProductionRuntime(): boolean {
  return process.env.NODE_ENV === "production";
}

function pick(...candidates: Array<string | undefined | null>): string | undefined {
  for (const c of candidates) {
    const t = typeof c === "string" ? c.trim() : "";
    if (t) return t;
  }
  return undefined;
}

export class MissingCryptoSecretError extends Error {
  readonly secretName: string;
  constructor(secretName: string) {
    super(
      `[secrets] ${secretName} is required in production. Set it via App Hosting secrets / .env (never NEXT_PUBLIC_*).`,
    );
    this.name = "MissingCryptoSecretError";
    this.secretName = secretName;
  }
}

export function isMissingCryptoSecretError(
  err: unknown,
): err is MissingCryptoSecretError {
  return err instanceof MissingCryptoSecretError;
}

/**
 * Resolve a secret. Preferred env vars first; `devFallbacks` only when not production.
 */
export function resolveCryptoSecret(opts: {
  /** Name for error messages / ops docs */
  name: string;
  preferred: Array<string | undefined | null>;
  /** Local-only — ignored when NODE_ENV === "production" */
  devFallbacks?: Array<string | undefined | null>;
}): string {
  const fromEnv = pick(...opts.preferred);
  if (fromEnv) return fromEnv;
  if (!isProductionRuntime()) {
    const dev = pick(...(opts.devFallbacks || []));
    if (dev) return dev;
  }
  throw new MissingCryptoSecretError(opts.name);
}

/** Soft resolve for verify paths — never throw; null = treat as invalid. */
export function tryResolveCryptoSecret(opts: {
  name: string;
  preferred: Array<string | undefined | null>;
  devFallbacks?: Array<string | undefined | null>;
}): string | null {
  try {
    return resolveCryptoSecret(opts);
  } catch {
    return null;
  }
}

/** Admin session cookie HMAC (AURA-104 / AURA-389). */
export function auraSessionSecret(): string {
  return resolveCryptoSecret({
    name: "AURA_SESSION_SECRET",
    preferred: [
      process.env.AURA_SESSION_SECRET,
      process.env.HOMEPAGE_UNLOCK_SECRET,
    ],
    devFallbacks: ["aura-session"],
  });
}

export function tryAuraSessionSecret(): string | null {
  return tryResolveCryptoSecret({
    name: "AURA_SESSION_SECRET",
    preferred: [
      process.env.AURA_SESSION_SECRET,
      process.env.HOMEPAGE_UNLOCK_SECRET,
    ],
    devFallbacks: ["aura-session"],
  });
}

/** `/api/media` HMAC (AURA-386 / AURA-389). */
export function mediaProxySecret(): string {
  return resolveCryptoSecret({
    name: "MEDIA_PROXY_SECRET (or AURA_SESSION_SECRET)",
    preferred: [
      process.env.MEDIA_PROXY_SECRET,
      process.env.AURA_SESSION_SECRET,
      process.env.HOMEPAGE_UNLOCK_SECRET,
    ],
    devFallbacks: ["aura-media-proxy"],
  });
}

export function tryMediaProxySecret(): string | null {
  return tryResolveCryptoSecret({
    name: "MEDIA_PROXY_SECRET (or AURA_SESSION_SECRET)",
    preferred: [
      process.env.MEDIA_PROXY_SECRET,
      process.env.AURA_SESSION_SECRET,
      process.env.HOMEPAGE_UNLOCK_SECRET,
    ],
    devFallbacks: ["aura-media-proxy"],
  });
}

/** Homepage unlock cookie salt (AURA-234 / AURA-389). */
export function homepageUnlockSecret(): string {
  return resolveCryptoSecret({
    name: "HOMEPAGE_UNLOCK_SECRET (or AURA_SESSION_SECRET)",
    preferred: [
      process.env.HOMEPAGE_UNLOCK_SECRET,
      process.env.AURA_SESSION_SECRET,
    ],
    devFallbacks: ["aura-homepage-unlock"],
  });
}

export function tryHomepageUnlockSecret(): string | null {
  return tryResolveCryptoSecret({
    name: "HOMEPAGE_UNLOCK_SECRET (or AURA_SESSION_SECRET)",
    preferred: [
      process.env.HOMEPAGE_UNLOCK_SECRET,
      process.env.AURA_SESSION_SECRET,
    ],
    devFallbacks: ["aura-homepage-unlock"],
  });
}

/**
 * Google Calendar refresh-token seal material (AURA-109 / AURA-389).
 * GOOGLE_CLIENT_SECRET is server-only — allowed as prod fallback.
 */
export function googleTokenSealSecret(): string {
  return resolveCryptoSecret({
    name: "GOOGLE_TOKEN_SECRET (or AURA_SESSION_SECRET)",
    preferred: [
      process.env.GOOGLE_TOKEN_SECRET,
      process.env.AURA_SESSION_SECRET,
      process.env.HOMEPAGE_UNLOCK_SECRET,
      process.env.GOOGLE_CLIENT_SECRET,
    ],
    devFallbacks: ["aura-google-token"],
  });
}
