/**
 * Signed Aura session cookie — Edge-safe (Web Crypto) for middleware (AURA-104).
 * Cookie value: `token.exp.sig` (HMAC-SHA256). Layout still loads the Firestore session.
 */

export const SESSION_COOKIE = "aura_session";
export const SESSION_DAYS = 14;
export const SESSION_MAX_AGE_SEC = SESSION_DAYS * 24 * 60 * 60;

function sessionSecret(): string {
  return (
    process.env.AURA_SESSION_SECRET?.trim() ||
    process.env.HOMEPAGE_UNLOCK_SECRET?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    "aura-session"
  );
}

function toBase64Url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) {
    out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return out === 0;
}

async function signPayload(payload: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(sessionSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return toBase64Url(sig);
}

export function sessionCookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    maxAge: SESSION_MAX_AGE_SEC,
  };
}

export function clearSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
  };
}

/** Mint signed cookie value from Firestore session token + ISO expiry. */
export async function mintSessionCookieValue(
  token: string,
  expiresAtIso: string,
): Promise<string> {
  const exp = Math.floor(new Date(expiresAtIso).getTime() / 1000);
  if (!token || !Number.isFinite(exp)) {
    throw new Error("Invalid session for cookie");
  }
  const payload = `${token}.${exp}`;
  const sig = await signPayload(payload);
  return `${payload}.${sig}`;
}

export type VerifiedSessionCookie = {
  token: string;
  expiresAtMs: number;
};

/**
 * Verify HMAC + expiry. Does not hit Firestore — layout/API still call getSession.
 */
export async function verifySessionCookie(
  value: string | null | undefined,
  nowMs = Date.now(),
): Promise<VerifiedSessionCookie | null> {
  if (!value) return null;
  const parts = value.split(".");
  if (parts.length !== 3) return null;
  const [token, expRaw, sig] = parts;
  if (!token || !expRaw || !sig) return null;
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(token)) return null;
  const exp = Number(expRaw);
  if (!Number.isFinite(exp) || exp * 1000 <= nowMs) return null;
  const payload = `${token}.${expRaw}`;
  const expected = await signPayload(payload);
  if (!safeEqual(sig, expected)) return null;
  return { token, expiresAtMs: exp * 1000 };
}
