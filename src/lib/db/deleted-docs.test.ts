/**
 * Tombstone key shape (AURA-099).
 * Run: npx vitest run src/lib/db/deleted-docs.test.ts
 * (or node --experimental-strip-types if vitest alias unavailable)
 */
import { describe, expect, it } from "vitest";
import { COL, deletedDocKey } from "./collections";

describe("deletedDocKey (AURA-099)", () => {
  it("namespaces collection and id", () => {
    expect(deletedDocKey(COL.projectSessions, "sess_1")).toBe(
      "projectSessions__sess_1",
    );
    expect(deletedDocKey(COL.projects, "proj_1")).toBe("projects__proj_1");
  });
});
