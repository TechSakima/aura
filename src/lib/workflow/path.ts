import type { ProjectWorkflowStep } from "@/lib/types";

/**
 * Continuous studio path (AURA-017 / AURA-261).
 *
 * One spine: book the job → get paid → plan & deliver.
 * Labels are plain studio language (“Get paid”, “Deliver photos”).
 * Prep is not a separate product; it starts after deposit.
 */
export const BOOK_STEPS: { id: ProjectWorkflowStep; label: string }[] = [
  { id: "inquiry", label: "Get details" },
  { id: "questionnaire", label: "Ask questions" },
  { id: "pricing", label: "Send quote" },
  { id: "contract", label: "Sign contract" },
  { id: "deposit", label: "Get paid" },
];

export const SESSION_STEPS: { id: ProjectWorkflowStep; label: string }[] = [
  { id: "prep", label: "Plan the shoot" },
  { id: "delivery", label: "Deliver photos" },
];

/** Full project workflow order (book + session handoff). */
export const PROJECT_PATH_STEPS = [...BOOK_STEPS, ...SESSION_STEPS];

/** Last book step — payment clears this before session tools. */
export const HANDOFF_AFTER_STEP: ProjectWorkflowStep = "deposit";

/** First session step on the project spine (session wizard continues shoot-day → wrap). */
export const SESSION_START_STEP: ProjectWorkflowStep = "prep";

export const HANDOFF_COPY = "Plan the shoot after you get paid";

const PATH_IDS = new Set(PROJECT_PATH_STEPS.map((s) => s.id));

export function isProjectWorkflowStep(
  value: unknown,
): value is ProjectWorkflowStep {
  return typeof value === "string" && PATH_IDS.has(value as ProjectWorkflowStep);
}

export function workflowStepLabel(step?: ProjectWorkflowStep): string {
  return (
    PROJECT_PATH_STEPS.find((s) => s.id === step)?.label ||
    BOOK_STEPS[0]!.label
  );
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
