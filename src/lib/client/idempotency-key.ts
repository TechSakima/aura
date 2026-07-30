/** Client Idempotency-Key for admin send retries (AURA-269). */

export function newIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

export function withIdempotencyHeaders(
  key: string,
  headers?: HeadersInit,
): HeadersInit {
  return {
    ...(headers || {}),
    "Idempotency-Key": key,
  };
}
