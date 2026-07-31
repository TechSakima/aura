import { createHash } from "crypto";
import { COL } from "@/lib/db/collections";
import { firebaseAdminConfigured, getAdminDb } from "@/lib/firebase/admin";

export { clientIp } from "@/lib/client-ip";

const buckets = new Map<string, { count: number; resetAt: number }>();

export type RateLimitResult =
  | { ok: true }
  | { ok: false; retryAfterSec: number };

function memoryLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
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

function rateLimitDocId(key: string): string {
  return createHash("sha256").update(key).digest("hex").slice(0, 40);
}

/**
 * Shared rate limit via Firestore (AURA-107) — works across App Hosting instances.
 * Falls back to in-process memory when Admin DB is unavailable.
 */
export async function rateLimitShared(
  key: string,
  limit = 20,
  windowMs = 60_000,
): Promise<RateLimitResult> {
  if (!firebaseAdminConfigured()) {
    return memoryLimit(key, limit, windowMs);
  }
  const db = getAdminDb();
  if (!db) {
    return memoryLimit(key, limit, windowMs);
  }

  const ref = db.collection(COL.rateLimits).doc(rateLimitDocId(key));
  const now = Date.now();

  try {
    return await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const data = snap.data() as
        | { count?: number; resetAt?: number }
        | undefined;

      if (!data?.resetAt || data.resetAt < now) {
        tx.set(ref, {
          count: 1,
          resetAt: now + windowMs,
          updatedAt: now,
        });
        return { ok: true as const };
      }

      const count = data.count ?? 0;
      if (count >= limit) {
        return {
          ok: false as const,
          retryAfterSec: Math.max(1, Math.ceil((data.resetAt - now) / 1000)),
        };
      }

      tx.update(ref, { count: count + 1, updatedAt: now });
      return { ok: true as const };
    });
  } catch {
    return memoryLimit(key, limit, windowMs);
  }
}

/**
 * In-memory rate limiter (per-process). Prefer `rateLimitShared` for auth,
 * pay/book/docs, PIN/download, and other multi-instance sensitive paths
 * (AURA-107 / AURA-392).
 */
export function rateLimit(
  key: string,
  limit = 20,
  windowMs = 60_000,
): RateLimitResult {
  return memoryLimit(key, limit, windowMs);
}
