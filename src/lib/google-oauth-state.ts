import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import {
  auraSessionSecret,
  tryAuraSessionSecret,
} from "@/lib/crypto-secrets";

/**
 * Google Calendar OAuth CSRF `state` (AURA-391).
 * Cookie holds signed nonce + studioId; authorize URL carries the nonce as `state`.
 */

export const GOOGLE_OAUTH_STATE_COOKIE = "aura_gcal_oauth";

/** Connect flow must complete within 15 minutes. */
const MAX_AGE_SEC = 60 * 15;

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export function googleOAuthStateCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: MAX_AGE_SEC,
  };
}

export function clearGoogleOAuthStateCookieOptions() {
  return {
    ...googleOAuthStateCookieOptions(),
    maxAge: 0,
  };
}

/** Mint OAuth `state` nonce + signed cookie value bound to studio. */
export function mintGoogleOAuthState(studioId: string): {
  state: string;
  cookieValue: string;
} {
  const nonce = randomBytes(24).toString("base64url");
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE_SEC;
  const payload = `${nonce}.${studioId}.${exp}`;
  const cookieValue = `${payload}.${sign(payload, auraSessionSecret())}`;
  return { state: nonce, cookieValue };
}

/**
 * Verify callback `state` against cookie for this studio.
 * Returns false on missing/expired/mismatch (fail closed).
 */
export function verifyGoogleOAuthState(opts: {
  state: string | null | undefined;
  cookieValue: string | null | undefined;
  studioId: string;
}): boolean {
  const state = String(opts.state || "").trim();
  const raw = String(opts.cookieValue || "").trim();
  if (!state || !raw || !opts.studioId) return false;

  const secret = tryAuraSessionSecret();
  if (!secret) return false;

  const parts = raw.split(".");
  if (parts.length !== 4) return false;
  const [nonce, studioId, expRaw, sig] = parts;
  if (!nonce || !studioId || !expRaw || !sig) return false;
  if (nonce !== state) return false;
  if (studioId !== opts.studioId) return false;

  const exp = Number(expRaw);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) {
    return false;
  }

  const payload = `${nonce}.${studioId}.${expRaw}`;
  const expected = sign(payload, secret);
  try {
    return safeEqual(sig, expected);
  } catch {
    return false;
  }
}
