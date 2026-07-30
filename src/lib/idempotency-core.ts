/**
 * Pure in-process idempotency (AURA-269). No Next.js imports.
 * Same pattern as rate-limit.ts — not shared across App Hosting instances.
 */

const TTL_MS = 15 * 60 * 1000;
const MAX_KEY_LEN = 128;

export type IdempotentJson = {
  status: number;
  body: Record<string, unknown>;
};

type Cached = IdempotentJson & { expiresAt: number };

const cache = new Map<string, Cached>();
const inflight = new Map<string, Promise<IdempotentJson>>();

function prune(now: number) {
  if (cache.size < 200) return;
  for (const [k, v] of cache) {
    if (v.expiresAt <= now) cache.delete(k);
  }
}

/** Read `Idempotency-Key` header (max 128 chars). */
export function readIdempotencyKey(req: Request): string | null {
  const raw = req.headers.get("Idempotency-Key")?.trim() || "";
  if (!raw) return null;
  return raw.slice(0, MAX_KEY_LEN);
}

/**
 * Run `fn` once per scope+key. Successful (2xx) JSON is replayed for TTL.
 * Concurrent callers with the same key share one in-flight execution.
 */
export async function runIdempotent(
  key: string | null,
  scope: string,
  fn: () => Promise<IdempotentJson>,
): Promise<IdempotentJson & { deduped?: boolean }> {
  if (!key) return fn();

  const fullKey = `${scope}:${key}`;
  const now = Date.now();
  prune(now);

  const hit = cache.get(fullKey);
  if (hit && hit.expiresAt > now) {
    return { status: hit.status, body: hit.body, deduped: true };
  }

  let work = inflight.get(fullKey);
  if (work) {
    const stored = await work;
    return { ...stored, deduped: true };
  }

  work = fn();
  inflight.set(fullKey, work);
  try {
    const stored = await work;
    if (stored.status >= 200 && stored.status < 300) {
      cache.set(fullKey, {
        ...stored,
        expiresAt: Date.now() + TTL_MS,
      });
    }
    return stored;
  } finally {
    inflight.delete(fullKey);
  }
}
