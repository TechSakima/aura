/**
 * Admin send idempotency (AURA-269).
 *
 * Run: node --experimental-strip-types --experimental-transform-types src/lib/idempotency.test.ts
 */

import assert from "node:assert/strict";
import { runIdempotent } from "./idempotency-core.ts";

{
  let runs = 0;
  const scope = `test-${Date.now()}-${Math.random()}`;
  const key = "same-key";

  const first = await runIdempotent(key, scope, async () => {
    runs += 1;
    return { status: 200, body: { ok: true, n: runs } };
  });
  assert.equal(first.status, 200);
  assert.equal(first.body.n, 1);
  assert.equal(first.deduped, undefined);

  const second = await runIdempotent(key, scope, async () => {
    runs += 1;
    return { status: 200, body: { ok: true, n: runs } };
  });
  assert.equal(second.status, 200);
  assert.equal(second.body.n, 1);
  assert.equal(second.deduped, true);
  assert.equal(runs, 1);
}

{
  let runs = 0;
  const scope = `fail-${Date.now()}-${Math.random()}`;
  const key = "fail-key";

  const first = await runIdempotent(key, scope, async () => {
    runs += 1;
    return { status: 502, body: { error: "nope" } };
  });
  assert.equal(first.status, 502);

  const second = await runIdempotent(key, scope, async () => {
    runs += 1;
    return { status: 200, body: { ok: true } };
  });
  assert.equal(second.status, 200);
  assert.equal(runs, 2);
}

{
  let runs = 0;
  const scope = `race-${Date.now()}-${Math.random()}`;
  const key = "race-key";

  const a = runIdempotent(key, scope, async () => {
    runs += 1;
    await new Promise((r) => setTimeout(r, 20));
    return { status: 200, body: { ok: true, n: runs } };
  });
  const b = runIdempotent(key, scope, async () => {
    runs += 1;
    return { status: 200, body: { ok: true, n: runs } };
  });
  const [ra, rb] = await Promise.all([a, b]);
  assert.equal(runs, 1);
  assert.equal(ra.body.n, 1);
  assert.equal(rb.body.n, 1);
  assert.equal(rb.deduped, true);
}

console.log("idempotency.test.ts: ok");
