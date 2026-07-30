/**
 * Triple state sync rules (AURA-173).
 *
 * Canonical relationships:
 * - `project.workflowStep` — pipeline position (inquiry → questionnaire → pricing → contract → deposit → prep → delivery)
 * - `project.stage` — coarse lifecycle (inquiry / booked / in_progress / delivered / completed / canceled / archived)
 * - `session.status` — session lifecycle (inquiry / proposed / booked / delivered / archived)
 *
 * Sync rules:
 * - Booking confirm / quote accept → stage=booked, workflowStep=contract, session.status=booked
 * - Deposit paid (webhook) → stage stays booked, workflowStep=prep (do not jump past unfinished steps — see 119)
 * - Gallery go-live → session.status=delivered, project.stage=delivered, workflowStep=delivery
 * - Wrap Mark delivered → session.status=delivered; project.stage=delivered (or completed if balance clear)
 * - Archive gallery → session.status=archived, project.stage=completed
 * - Decline/cancel → project.stage=canceled, workflowStep=inquiry, session archived
 *
 * Do NOT: payment → workflowStep=prep unconditionally (119); contract sign → workflowStep=deposit if already paid/further (120).
 */

export const WORKFLOW_STATE_RULES_VERSION = 1;

/** Gallery go-live side effects: session → delivered; project → delivered, workflowStep → delivery. */
export function applyGalleryLiveProjectSideEffects(db: import("@/lib/types").AuraDatabase, projectId: string) {
  const p = db.projects.find((x) => x.id === projectId);
  if (!p || p.stage === "canceled" || p.stage === "archived") return;
  const now = new Date().toISOString();
  p.stage = "delivered";
  p.workflowStep = "delivery";
  p.updatedAt = now;
}
