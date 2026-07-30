import { NextResponse } from "next/server";
import {
  readIdempotencyKey,
  runIdempotent,
  type IdempotentJson,
} from "@/lib/idempotency-core";

export { readIdempotencyKey, runIdempotent, type IdempotentJson };

/** NextResponse wrapper around `runIdempotent`. */
export async function withIdempotency(
  key: string | null,
  scope: string,
  fn: () => Promise<NextResponse>,
): Promise<NextResponse> {
  const result = await runIdempotent(key, scope, async () => {
    const res = await fn();
    const body = (await res
      .clone()
      .json()
      .catch(() => ({}))) as Record<string, unknown>;
    return { status: res.status, body };
  });
  const body =
    result.deduped && result.body && typeof result.body === "object"
      ? { ...result.body, deduped: true }
      : result.body;
  return NextResponse.json(body, { status: result.status });
}
