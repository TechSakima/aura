/**
 * Run: node --experimental-strip-types --experimental-transform-types src/lib/security-headers.test.ts
 */
import assert from "node:assert/strict";
import {
  buildContentSecurityPolicy,
  securityHeaders,
} from "./security-headers.ts";

const csp = buildContentSecurityPolicy();
assert.match(csp, /frame-ancestors 'self'/);
assert.doesNotMatch(csp, /frame-ancestors 'none'/);
assert.match(csp, /object-src 'none'/);

const headers = securityHeaders({ isProduction: true, enforceCsp: false });
const xfo = headers.find((h) => h.key === "X-Frame-Options");
assert.equal(xfo?.value, "SAMEORIGIN");
assert.equal(
  headers.find((h) => h.key === "Content-Security-Policy-Report-Only")?.value,
  csp,
);
assert.equal(
  headers.some((h) => h.key === "Content-Security-Policy"),
  false,
);
assert.match(
  headers.find((h) => h.key === "Strict-Transport-Security")?.value ?? "",
  /max-age=/,
);

const enforced = securityHeaders({ isProduction: false, enforceCsp: true });
assert.equal(
  enforced.find((h) => h.key === "Content-Security-Policy")?.value,
  csp,
);
assert.equal(
  enforced.some((h) => h.key === "Strict-Transport-Security"),
  false,
);

console.log("security-headers.test: ok");
