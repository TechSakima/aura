import type { AuraDatabase, ProjectWorkflowStep } from "@/lib/types";
import {
  isProjectWorkflowStep,
  projectPathIndex,
} from "@/lib/workflow/path";

/**
 * Triple state sync rules (AURA-173 / AURA-277).
 *
 * Canonical relationships:
 * - `project.workflowStep` — pipeline position (inquiry → questionnaire → pricing → contract → deposit → prep → delivery)
 * - `project.stage` — coarse lifecycle (inquiry / booked / in_progress / delivered / completed / canceled / archived)
 * - `session.status` — session lifecycle (inquiry / proposed / booked / delivered / archived)
 *
 * Sync rules:
 * - Booking confirm / quote accept → stage=booked, workflowStep=contract, session.status=booked
 * - Deposit paid (webhook) → stage stays booked; workflowStep=prep only when already on deposit (119)
 * - Gallery go-live → session.status=delivered, project.stage=delivered, workflowStep=delivery
 * - Wrap Mark delivered → session.status=delivered; project.stage=delivered (or completed if balance clear)
 * - Archive gallery → session.status=archived, project.stage=completed
 * - Decline/cancel → project.stage=canceled, workflowStep=inquiry, session archived
 *
 * Do NOT: payment → workflowStep=prep unconditionally (119); contract sign → workflowStep=deposit if already further (120).
 */

export const WORKFLOW_STATE_RULES_VERSION = 1;

/**
 * After a deposit payment lands (AURA-119).
 * Advance to prep only from deposit; never skip unfinished earlier steps; never regress.
 */
export function workflowStepAfterDepositPaid(
  current?: ProjectWorkflowStep | string | null,
): ProjectWorkflowStep {
  const step = isProjectWorkflowStep(current) ? current : "inquiry";
  const idx = projectPathIndex(step);
  const depositIdx = projectPathIndex("deposit");
  if (idx === depositIdx) return "prep";
  if (idx > depositIdx) return step;
  return step;
}

/**
 * After a contract is signed (AURA-120).
 * Move to deposit when still on/before contract; undefined = leave workflow unchanged.
 */
export function workflowStepAfterContractSigned(
  current?: ProjectWorkflowStep | string | null,
): ProjectWorkflowStep | undefined {
  const step = isProjectWorkflowStep(current) ? current : "inquiry";
  const idx = projectPathIndex(step);
  const depositIdx = projectPathIndex("deposit");
  if (idx < depositIdx) return "deposit";
  return undefined;
}

/** Gallery go-live side effects: session → delivered; project → delivered, workflowStep → delivery. */
export function applyGalleryLiveProjectSideEffects(
  db: AuraDatabase,
  projectId: string,
) {
  const p = db.projects.find((x) => x.id === projectId);
  if (!p || p.stage === "canceled" || p.stage === "archived") return;
  const now = new Date().toISOString();
  p.stage = "delivered";
  p.workflowStep = "delivery";
  p.updatedAt = now;
}
