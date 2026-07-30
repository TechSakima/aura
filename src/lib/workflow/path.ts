import type { ProjectWorkflowStep } from "@/lib/types";

/**
 * Continuous studio path (AURA-017).
 *
 * One spine: book the job → deposit clears → session tools (prep → wrap).
 * Prep is not a separate product; it starts after deposit.
 */
export const BOOK_STEPS: { id: ProjectWorkflowStep; label: string }[] = [
  { id: "inquiry", label: "Inquiry" },
  { id: "questionnaire", label: "Questionnaire" },
  { id: "pricing", label: "Pricing" },
  { id: "contract", label: "Contract" },
  { id: "deposit", label: "Deposit" },
];

export const SESSION_STEPS: { id: ProjectWorkflowStep; label: string }[] = [
  { id: "prep", label: "Prep" },
  { id: "delivery", label: "Delivery" },
];

/** Full project workflow order (book + session handoff). */
export const PROJECT_PATH_STEPS = [...BOOK_STEPS, ...SESSION_STEPS];

/** Last book step — payment clears this before session tools. */
export const HANDOFF_AFTER_STEP: ProjectWorkflowStep = "deposit";

/** First session step on the project spine (session wizard continues shoot-day → wrap). */
export const SESSION_START_STEP: ProjectWorkflowStep = "prep";

export const HANDOFF_COPY = "Prep starts after deposit";

const PATH_IDS = new Set(PROJECT_PATH_STEPS.map((s) => s.id));

export function isProjectWorkflowStep(
  value: unknown,
): value is ProjectWorkflowStep {
  return typeof value === "string" && PATH_IDS.has(value as ProjectWorkflowStep);
}

export function projectPathIndex(step?: ProjectWorkflowStep) {
  const i = PROJECT_PATH_STEPS.findIndex((s) => s.id === step);
  return i >= 0 ? i : 0;
}

export function isSessionPathStep(step?: ProjectWorkflowStep) {
  return SESSION_STEPS.some((s) => s.id === step);
}

export function nextProjectPathStep(
  step?: ProjectWorkflowStep,
): ProjectWorkflowStep | null {
  const i = projectPathIndex(step);
  return PROJECT_PATH_STEPS[i + 1]?.id ?? null;
}

export function previousProjectPathStep(
  step?: ProjectWorkflowStep,
): ProjectWorkflowStep | null {
  const i = projectPathIndex(step);
  if (i <= 0) return null;
  return PROJECT_PATH_STEPS[i - 1]?.id ?? null;
}

/** True when project workflow has cleared deposit (session tools are in play). */
export function sessionToolsUnlocked(step?: ProjectWorkflowStep) {
  return projectPathIndex(step) > projectPathIndex(HANDOFF_AFTER_STEP);
}
