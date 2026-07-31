/**
 * Per-session prep/delivery readiness for multi-session projects (AURA-129).
 * Project badges aggregate open sessions; archived sessions do not block.
 */

export type SessionPrepHint = {
  status?: string;
  prepComplete?: boolean;
  currentStep?: string;
  wizardSkippedPrep?: boolean;
};

export type SessionDeliveryHint = {
  status?: string;
  deliveryComplete?: boolean;
  galleryStatus?: string;
};

export function isOpenSession(status?: string): boolean {
  return status !== "archived";
}

export function isSessionPrepReady(s: SessionPrepHint): boolean {
  if (!isOpenSession(s.status)) return true;
  return Boolean(
    s.prepComplete ||
      s.wizardSkippedPrep ||
      s.currentStep === "shoot-day" ||
      s.currentStep === "delivery" ||
      s.currentStep === "wrap",
  );
}

export function isSessionDeliveryReady(s: SessionDeliveryHint): boolean {
  if (!isOpenSession(s.status)) return true;
  return Boolean(
    s.deliveryComplete ||
      s.status === "delivered" ||
      s.galleryStatus === "live" ||
      s.galleryStatus === "archived",
  );
}

export function aggregateSessionStepState(opts: {
  unlocked: boolean;
  currentIsStep: boolean;
  readyCount: number;
  total: number;
}): {
  state: "done" | "active" | "todo";
  readyCount: number;
  total: number;
} {
  const { unlocked, currentIsStep, readyCount, total } = opts;
  if (!unlocked || total === 0) {
    return { state: "todo", readyCount, total };
  }
  if (readyCount >= total) {
    return { state: "done", readyCount, total };
  }
  if (readyCount > 0 || currentIsStep) {
    return { state: "active", readyCount, total };
  }
  return { state: "todo", readyCount, total };
}

/** Badge copy when more than one open session. */
export function multiSessionBadgeLabel(
  state: "done" | "active" | "todo",
  isCurrent: boolean,
  readyCount: number,
  total: number,
): string | null {
  if (total <= 1) return null;
  if (state === "done") return `Done · ${total}`;
  if (readyCount > 0) return `${readyCount} of ${total}`;
  if (isCurrent) return "Current";
  if (state === "active") return "In progress";
  return "Next";
}
