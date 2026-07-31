/**
 * Admin origin allowlist (AURA-415).
 *
 * Run: node --experimental-strip-types --experimental-transform-types src/lib/admin-origin.test.ts
 */

import assert from "node:assert/strict";
import {
  adminMutationOriginAllowed,
  shouldCheckAdminMutationOrigin,
} from "./admin-origin.ts";

assert.equal(shouldCheckAdminMutationOrigin("POST", "/api/projects"), true);
assert.equal(shouldCheckAdminMutationOrigin("GET", "/api/projects"), false);
assert.equal(
  shouldCheckAdminMutationOrigin("POST", "/api/public/book/x"),
  false,
);
assert.equal(shouldCheckAdminMutationOrigin("POST", "/api/auth/login"), false);
assert.equal(
  shouldCheckAdminMutationOrigin("POST", "/api/webhooks/stripe"),
  false,
);

// Check disabled unless env enables — unit env may not set production.
const prev = process.env.AURA_ADMIN_ORIGIN_CHECK;
const prevUrl = process.env.NEXT_PUBLIC_APP_URL;
process.env.AURA_ADMIN_ORIGIN_CHECK = "1";
process.env.NEXT_PUBLIC_APP_URL = "https://aura.example.com";

assert.equal(
  adminMutationOriginAllowed({
    headers: new Headers({ origin: "https://aura.example.com" }),
  }),
  true,
  "allowed origin",
);

assert.equal(
  adminMutationOriginAllowed({
    headers: new Headers({ origin: "https://evil.example" }),
  }),
  false,
  "reject foreign origin",
);

assert.equal(
  adminMutationOriginAllowed({
    headers: new Headers({ referer: "https://aura.example.com/admin" }),
  }),
  true,
  "referer fallback",
);

assert.equal(
  adminMutationOriginAllowed({ headers: new Headers() }),
  false,
  "missing origin/referer rejected when check on",
);

process.env.AURA_ADMIN_ORIGINS = "https://preview.example.com";
assert.equal(
  adminMutationOriginAllowed({
    headers: new Headers({ origin: "https://preview.example.com" }),
  }),
  true,
  "extra allowlist origin",
);

process.env.AURA_ADMIN_ORIGIN_CHECK = "0";
assert.equal(
  adminMutationOriginAllowed({
    headers: new Headers({ origin: "https://evil.example" }),
  }),
  true,
  "check off → allow",
);

if (prev === undefined) delete process.env.AURA_ADMIN_ORIGIN_CHECK;
else process.env.AURA_ADMIN_ORIGIN_CHECK = prev;
if (prevUrl === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
else process.env.NEXT_PUBLIC_APP_URL = prevUrl;
delete process.env.AURA_ADMIN_ORIGINS;

console.log("admin-origin.test.ts: ok");
