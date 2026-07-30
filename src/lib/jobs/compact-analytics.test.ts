import {
  analyticsRetentionCutoff,
  pickStudioIdsForCap,
} from "./compact-analytics";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`compact-analytics.test: ${msg}`);
}

const cutoff = analyticsRetentionCutoff(
  new Date("2026-07-30T12:00:00.000Z"),
  180,
);
assert(
  cutoff === "2026-01-31T12:00:00.000Z",
  `180-day cutoff expected, got ${cutoff}`,
);

assert(pickStudioIdsForCap([], 0, 5).length === 0, "empty studios");
assert(
  pickStudioIdsForCap(["b", "a", "c"], 0, 2).join(",") === "a,b",
  "sorted rotate from day 0",
);
assert(
  pickStudioIdsForCap(["b", "a", "c"], 1, 2).join(",") === "b,c",
  "sorted rotate from day 1",
);
assert(
  pickStudioIdsForCap(["a", "b"], 0, 5).join(",") === "a,b",
  "perRun capped to studio count",
);

console.log("compact-analytics.test: all assertions passed");
