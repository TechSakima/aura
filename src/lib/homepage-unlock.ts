import { createHmac, timingSafeEqual } from "crypto";
import {
  homepageUnlockSecret,
  tryHomepageUnlockSecret,
} from "@/lib/crypto-secrets";

export const HOMEPAGE_UNLOCK_COOKIE = "aura_hp_unlock";

/** Unlock lasts 30 days or until site password changes. */
const MAX_AGE_SEC = 60 * 60 * 24 * 30;

function signingKey(passwordHash: string, salt: string): string {
  return `${passwordHash}:${salt}`;
}

function sign(payload: string, passwordHash: string, salt: string): string {
  return createHmac("sha256", signingKey(passwordHash, salt))
    .update(payload)
    .digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

/**
 * Cookie value: `slug.exp.sig` — scoped unlock for one homepage slug (AURA-234).
 * Bound to passwordHash so changing the password invalidates prior unlocks.
 */
export function createHomepageUnlockToken(
  slug: string,
  passwordHash: string,
  nowMs = Date.now(),
): string {
  const exp = Math.floor(nowMs / 1000) + MAX_AGE_SEC;
  const payload = `${slug}.${exp}`;
  const salt = homepageUnlockSecret();
  return `${payload}.${sign(payload, passwordHash, salt)}`;
}

export function verifyHomepageUnlockToken(
  token: string | null | undefined,
  slug: string,
  passwordHash: string,
  nowMs = Date.now(),
): boolean {
  if (!token || !slug || !passwordHash) return false;
  const salt = tryHomepageUnlockSecret();
  if (!salt) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [tokenSlug, expRaw, sig] = parts;
  if (!tokenSlug || !expRaw || !sig) return false;
  if (tokenSlug !== slug) return false;
  const exp = Number(expRaw);
  if (!Number.isFinite(exp) || exp * 1000 < nowMs) return false;
  const payload = `${tokenSlug}.${expRaw}`;
  const expected = sign(payload, passwordHash, salt);
  return safeEqual(sig, expected);
}

export function parseHomepageUnlockFromCookieHeader(
  cookieHeader: string | null,
): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(
    new RegExp(`(?:^|;\\s*)${HOMEPAGE_UNLOCK_COOKIE}=([^;]+)`),
  );
  if (!match?.[1]) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}

export function homepageUnlockCookieHeader(token: string): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${HOMEPAGE_UNLOCK_COOKIE}=${encodeURIComponent(token)}; Path=/; Max-Age=${MAX_AGE_SEC}; SameSite=Lax; HttpOnly${secure}`;
}

export function isHomepageUnlocked(opts: {
  cookieHeader: string | null;
  slug: string;
  passwordHash?: string;
}): boolean {
  if (!opts.passwordHash) return true;
  const token = parseHomepageUnlockFromCookieHeader(opts.cookieHeader);
  return verifyHomepageUnlockToken(token, opts.slug, opts.passwordHash);
}
