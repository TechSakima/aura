/**
 * Canonical admin deep links (AURA-263 / AURA-063).
 * Prefer these over bare `/admin/projects/{id}` so notifications land on the right step.
 * Full map (canonical + legacy aliases): `docs/ADMIN_ROUTES.md`.
 */

export function projectWorkflowHref(projectId: string): string {
  return `/admin/projects/${projectId}#workflow`;
}

export function projectMessagesHref(projectId: string): string {
  return `/admin/projects/${projectId}#messages`;
}

export function sessionMessagesHref(
  projectId: string,
  sessionId: string,
): string {
  return `/admin/projects/${projectId}/sessions/${sessionId}#messages`;
}

export function sessionDeliveryHref(
  projectId: string,
  sessionId: string,
): string {
  return `/admin/projects/${projectId}/sessions/${sessionId}?step=delivery`;
}

export function sessionShootDayHref(
  projectId: string,
  sessionId: string,
): string {
  return `/admin/projects/${projectId}/sessions/${sessionId}?step=shoot-day`;
}

export function sessionPrepHref(projectId: string, sessionId: string): string {
  return `/admin/projects/${projectId}/sessions/${sessionId}?step=prep`;
}

export function bookingsHref(): string {
  return "/admin/bookings";
}

export function paymentsHref(): string {
  return "/admin/payments";
}

export function dashboardMessagesHref(): string {
  return "/admin#messages";
}

/** Prefer session delivery when both ids known; else project workflow. */
export function projectOrSessionDeliveryHref(opts: {
  projectId?: string | null;
  sessionId?: string | null;
  fallback?: string;
}): string {
  const projectId = opts.projectId?.trim();
  const sessionId = opts.sessionId?.trim();
  if (projectId && sessionId) return sessionDeliveryHref(projectId, sessionId);
  if (projectId) return projectWorkflowHref(projectId);
  return opts.fallback || paymentsHref();
}
