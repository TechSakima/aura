/**
 * Run: node --experimental-strip-types --experimental-transform-types src/lib/db/photo-page.test.ts
 */
import assert from "node:assert/strict";
import { pageBySortOrder } from "./photo-page.ts";

const rows = [
  { id: "c", sortOrder: 3 },
  { id: "a", sortOrder: 1 },
  { id: "b", sortOrder: "2" },
  { id: "z", sortOrder: undefined },
];

const page = pageBySortOrder(rows, 1, 2);
assert.deepEqual(
  page.photos.map((p) => p.id),
  ["a", "b"],
);
assert.equal(page.total, 4);

const empty = pageBySortOrder([], 0, 48);
assert.deepEqual(empty, { photos: [], total: 0 });

console.log("photo-page.test: ok");
