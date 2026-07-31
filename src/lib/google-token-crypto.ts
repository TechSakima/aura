import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { googleTokenSealSecret } from "@/lib/crypto-secrets";

/**
 * AES-256-GCM seal for Google Calendar refresh tokens at rest (AURA-109 / AURA-389).
 * Format: `enc:v1:{iv}.{ciphertext}.{tag}` (base64url). Legacy plaintext still opens.
 */

export const GOOGLE_TOKEN_SEAL_PREFIX = "enc:v1:";

function secretKey(): Buffer {
  return createHash("sha256").update(googleTokenSealSecret()).digest();
}

export function isSealedGoogleRefreshToken(value: string | null | undefined): boolean {
  return Boolean(value?.startsWith(GOOGLE_TOKEN_SEAL_PREFIX));
}

/** Encrypt plaintext for Firestore. Idempotent if already sealed. */
export function sealGoogleRefreshToken(plain: string): string {
  const text = plain.trim();
  if (!text) return text;
  if (isSealedGoogleRefreshToken(text)) return text;

  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", secretKey(), iv);
  const enc = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return (
    GOOGLE_TOKEN_SEAL_PREFIX +
    `${iv.toString("base64url")}.${enc.toString("base64url")}.${tag.toString("base64url")}`
  );
}

/** Decrypt sealed token, or return legacy plaintext unchanged. */
export function openGoogleRefreshToken(stored: string): string {
  const text = stored.trim();
  if (!text) return text;
  if (!isSealedGoogleRefreshToken(text)) return text;

  const body = text.slice(GOOGLE_TOKEN_SEAL_PREFIX.length);
  const parts = body.split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid sealed Google token");
  }
  const [ivB, encB, tagB] = parts;
  if (!ivB || !encB || !tagB) {
    throw new Error("Invalid sealed Google token");
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    secretKey(),
    Buffer.from(ivB, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tagB, "base64url"));
  const plain = Buffer.concat([
    decipher.update(Buffer.from(encB, "base64url")),
    decipher.final(),
  ]);
  return plain.toString("utf8");
}
