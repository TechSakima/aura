/** Canonical session link — prefer sessionId, fall back to deprecated shootId. */
export function linkedSessionId(entity: {
  sessionId?: string | null;
  shootId?: string | null;
}): string | undefined {
  const id = entity.sessionId || entity.shootId;
  return id ? String(id) : undefined;
}
