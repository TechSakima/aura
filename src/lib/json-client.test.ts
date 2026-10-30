/**
 * Run: node --experimental-strip-types --experimental-transform-types src/lib/json-client.test.ts
 */
import assert from "node:assert/strict";
import { toClientJson } from "./json-client.ts";

const cycle: { n: number; self?: unknown } = { n: 1 };
cycle.self = cycle;
const stamped = {
  expiresAt: {
    toDate() {
      return new Date("2024-06-01T00:00:00.000Z");
    },
  },
  cycle,
};

const out = toClientJson(stamped);
assert.equal(out.expiresAt, "2024-06-01T00:00:00.000Z");
assert.equal(out.cycle.n, 1);
assert.equal("self" in out.cycle, false);

const shared = { id: "p1" };
const dag = toClientJson({ a: shared, b: shared });
assert.equal(dag.a.id, "p1");
assert.equal(dag.b.id, "p1");

console.log("json-client.test: ok");
