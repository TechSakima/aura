/** Client offline / network failure helpers (AURA-291). */

export function isLikelyOffline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

export function isNetworkError(error: unknown): boolean {
  if (isLikelyOffline()) return true;
  if (error instanceof TypeError) return true;
  if (error instanceof Error) {
    return /failed to fetch|networkerror|load failed/i.test(error.message);
  }
  return false;
}

/** Sparse danger copy when a mutation cannot reach the server. */
export function mutationOfflineMessage(action = "save"): string {
  if (isLikelyOffline()) {
    return `You’re offline — couldn’t ${action}`;
  }
  return `Couldn’t ${action} — try again`;
}
