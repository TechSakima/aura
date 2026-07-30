/**
 * Lightweight anti-spam for public write paths (AURA-108).
 * Prefer honeypot + time-trap + shared rate limits over CAPTCHA for gallery UX.
 */

export const PUBLIC_SPAM_MIN_ELAPSED_MS = 1_500;
export const PUBLIC_SPAM_MAX_ELAPSED_MS = 6 * 60 * 60 * 1_000;

export const COMMENT_MAX_BODY_CHARS = 1_000;
export const COMMENT_MAX_NAME_CHARS = 80;

/** Discard submit when honeypot filled or timing is bot-like. */
export function isPublicSpamTrap(opts: {
  honeypot?: string | null;
  startedAt?: number | null;
}): boolean {
  if (opts.honeypot?.trim()) return true;
  const startedAt = opts.startedAt;
  if (startedAt == null || !Number.isFinite(startedAt)) return true;
  const elapsed = Date.now() - startedAt;
  if (elapsed < PUBLIC_SPAM_MIN_ELAPSED_MS) return true;
  if (elapsed > PUBLIC_SPAM_MAX_ELAPSED_MS) return true;
  return false;
}

export function sanitizePublicCommentText(value: string, max: number): string {
  return value
    .replace(/\u0000/g, "")
    .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}
