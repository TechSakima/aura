import {
  aggregateSessionStepState,
  isSessionDeliveryReady,
  isSessionPrepReady,
  multiSessionBadgeLabel,
} from "./session-readiness";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`session-readiness.test: ${msg}`);
}

assert(isSessionPrepReady({ prepComplete: true }), "prepComplete");
assert(
  isSessionPrepReady({ currentStep: "delivery" }),
  "past prep via currentStep",
);
assert(isSessionPrepReady({ status: "archived" }), "archived counts ready");
assert(!isSessionPrepReady({ status: "booked" }), "open incomplete");

assert(
  isSessionDeliveryReady({ galleryStatus: "live" }),
  "live gallery = delivery ready",
);
assert(
  isSessionDeliveryReady({ status: "archived" }),
  "archived session delivery ready",
);

const allDone = aggregateSessionStepState({
  unlocked: true,
  currentIsStep: false,
  readyCount: 2,
  total: 2,
});
assert(allDone.state === "done", "all sessions done");

const partial = aggregateSessionStepState({
  unlocked: true,
  currentIsStep: false,
  readyCount: 1,
  total: 3,
});
assert(partial.state === "active", "partial is active");
assert(
  multiSessionBadgeLabel("active", false, 1, 3) === "1 of 3",
  "partial badge",
);
assert(
  multiSessionBadgeLabel("done", false, 3, 3) === "Done · 3",
  "done badge with count",
);

const locked = aggregateSessionStepState({
  unlocked: false,
  currentIsStep: true,
  readyCount: 0,
  total: 2,
});
assert(locked.state === "todo", "locked stays todo");

console.log("session-readiness.test: all assertions passed");
