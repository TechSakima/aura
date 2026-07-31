/**
 * Run: node --experimental-strip-types --experimental-transform-types src/lib/inbound-text.test.ts
 */

import assert from "node:assert/strict";
import { stripInboundSignatureNoise } from "./inbound-text.ts";

{
  const cleaned = stripInboundSignatureNoise(
    [
      "Could we shift it to another time?",
      "",
      "Thanks,",
      "[A blue and grey logo Description automatically generated]",
      "Enoch Harker",
      "Stroburm Ventures LLC",
    ].join("\n"),
  );
  assert.ok(cleaned.includes("Could we shift it to another time?"));
  assert.ok(!cleaned.includes("Description automatically generated"));
  assert.ok(!cleaned.includes("[A blue and grey logo"));
}

{
  const cleaned = stripInboundSignatureNoise(
    "Short note\n-- \nEnoch Harker\nenoch@example.com",
  );
  assert.equal(cleaned, "Short note");
}

{
  const cleaned = stripInboundSignatureNoise(
    "Hello there\n\nSent from my iPhone",
  );
  assert.equal(cleaned, "Hello there");
}

console.log("inbound-text.test.ts: ok");
