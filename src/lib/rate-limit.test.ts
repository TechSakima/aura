/**
 * clientIp trust order (AURA-414).
 *
 * Run: node --experimental-strip-types --experimental-transform-types src/lib/rate-limit.test.ts
 */

import assert from "node:assert/strict";
import { clientIp } from "./client-ip.ts";

function req(headers: Record<string, string>): Request {
  return new Request("http://localhost/api/x", { headers });
}

assert.equal(
  clientIp(req({ "cf-connecting-ip": "203.0.113.10" })),
  "203.0.113.10",
  "CF-Connecting-IP wins",
);

assert.equal(
  clientIp(
    req({
      "cf-connecting-ip": "203.0.113.10",
      "x-forwarded-for": "198.51.100.1, 203.0.113.10",
    }),
  ),
  "203.0.113.10",
  "CF beats spoofed leftmost XFF",
);

assert.equal(
  clientIp(req({ "x-forwarded-for": "198.51.100.1, 203.0.113.50" })),
  "203.0.113.50",
  "rightmost XFF is trusted hop",
);

assert.equal(
  clientIp(req({ "x-forwarded-for": "not-an-ip, 203.0.113.9" })),
  "203.0.113.9",
  "skip garbage hops from the right",
);

assert.equal(
  clientIp(req({ "x-real-ip": "203.0.113.77" })),
  "203.0.113.77",
  "X-Real-IP fallback",
);

assert.equal(clientIp(req({})), "local", "no headers → local");

console.log("rate-limit.test.ts: ok");
