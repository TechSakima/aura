import "server-only";

import { createHmac, timingSafeEqual } from "crypto";
import {
  mediaProxySecret,
  tryMediaProxySecret,
} from "@/lib/crypto-secrets";

/** Match proxy → R2 redirect TTL (AURA-106 / AURA-386). */
export const MEDIA_PROXY_TTL_SEC = 60 * 60;

function sign(objectPath: string, exp: number, secret: string): string {
  return createHmac("sha256", secret)
    .update(`${objectPath}\n${exp}`)
    .digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

/** Stable path-only proxy URL for storage (not loadable without mint). */
export function mediaProxyPathUrl(objectPath: string): string {
  return `/api/media/${objectPath.split("/").map(encodeURIComponent).join("/")}`;
}

/** HMAC-bound proxy URL for browser GETs (AURA-386 / AURA-389). */
export function mintMediaProxyUrl(
  objectPath: string,
  opts?: { expiresInSec?: number },
): string {
  const ttl = opts?.expiresInSec ?? MEDIA_PROXY_TTL_SEC;
  const exp = Math.floor(Date.now() / 1000) + Math.max(60, ttl);
  const sig = sign(objectPath, exp, mediaProxySecret());
  const base = mediaProxyPathUrl(objectPath);
  return `${base}?exp=${exp}&sig=${encodeURIComponent(sig)}`;
}

export function verifyMediaProxyToken(
  objectPath: string,
  expRaw: string | null,
  sigRaw: string | null,
): boolean {
  if (!objectPath.startsWith("studios/") || objectPath.includes("/originals/")) {
    return false;
  }
  const secret = tryMediaProxySecret();
  if (!secret) return false;
  const exp = Number(expRaw);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) {
    return false;
  }
  const sig = String(sigRaw || "").trim();
  if (!sig) return false;
  const expected = sign(objectPath, exp, secret);
  try {
    return safeEqual(sig, expected);
  } catch {
    return false;
  }
}
