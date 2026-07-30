/**
 * First-project guide (AURA-260).
 *
 * Run: node --experimental-strip-types --experimental-transform-types src/lib/first-project-guide.test.ts
 */

import assert from "node:assert/strict";
import { buildFirstProjectGuide } from "./first-project-guide";
import type { Contract, Project, Proposal } from "./types";

function project(
  partial: Partial<Project> & Pick<Project, "id" | "name">,
): Project {
  return {
    studioId: "s1",
    stage: "inquiry",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...partial,
  } as Project;
}

{
  const guide = buildFirstProjectGuide({
    projects: [],
    proposals: [],
    contracts: [],
    invoices: [],
    stripeOnboardingComplete: false,
  });
  assert.equal(guide.complete, false);
  assert.equal(guide.done, 0);
  assert.equal(guide.items[0]?.href, "/admin/projects?new=1");
}

{
  const p = project({ id: "p1", name: "Ada" });
  const proposals = [
    {
      id: "q1",
      projectId: "p1",
      status: "sent",
      depositStatus: "pending",
    } as Proposal,
  ];
  const contracts = [
    { id: "c1", projectId: "p1", status: "sent", token: "t" } as Contract,
  ];
  let guide = buildFirstProjectGuide({
    projects: [p],
    proposals,
    contracts,
    invoices: [],
    stripeOnboardingComplete: true,
  });
  assert.equal(guide.done, 3);
  assert.equal(guide.items.find((i) => i.id === "deposit")?.done, false);

  guide = buildFirstProjectGuide({
    projects: [p],
    proposals: [
      { ...proposals[0]!, depositStatus: "received" } as Proposal,
    ],
    contracts,
    invoices: [],
    stripeOnboardingComplete: true,
  });
  assert.equal(guide.complete, true);
}

{
  const p = project({ id: "p1", name: "Ada" });
  const guide = buildFirstProjectGuide({
    projects: [p],
    proposals: [],
    contracts: [],
    invoices: [],
    stripeOnboardingComplete: false,
  });
  assert.equal(
    guide.items.find((i) => i.id === "deposit")?.href,
    "/admin/settings/payments",
  );
}

console.log("first-project-guide.test.ts: ok");
