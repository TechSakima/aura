/**
 * Product toasts when an email action completes without delivering (AURA-136).
 * Prefer outcome language over infra (“skipped”).
 */
export function toastAfterEmailAttempt(
  emailed: boolean,
  sentLabel: string,
  readyLabel: string,
): { message: string; tone: "success" | "neutral" } {
  if (emailed) {
    return { message: sentLabel, tone: "success" };
  }
  return { message: readyLabel, tone: "neutral" };
}
