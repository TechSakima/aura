/**
 * Canonical admin deep links (AURA-263 / AURA-063 / AURA-370).
 * Prefer these over bare `/admin/projects/{id}` so notifications land on the right step.
 * Full map (canonical + legacy aliases): `docs/ADMIN_ROUTES.md`.
 *
 * Path segments accept opaque ids or `adminSlug` — both resolve.
 * Prefer `adminPathSegment(entity)` when the entity is loaded.
 */

import { adminPathSegment } from "@/lib/admin-slug";

export function projectHref(projectRef: string): string {
  return `/admin/projects/${projectRef}`;
}

export function projectWorkflowHref(projectRef: string): string {
  return `/admin/projects/${projectRef}#workflow`;
}

export function projectMessagesHref(projectRef: string): string {
  return `/admin/projects/${projectRef}#messages`;
}

export function sessionHref(projectRef: string, sessionRef: string): string {
  return `/admin/projects/${projectRef}/sessions/${sessionRef}`;
}

/** Short session-first entry (AURA-370) — redirects to project/session path. */
export function sessionFirstHref(sessionRef: string): string {
  return `/admin/sessions/${sessionRef}`;
}

export function sessionMessagesHref(
  projectRef: string,
  sessionRef: string,
): string {
  return `/admin/projects/${projectRef}/sessions/${sessionRef}#messages`;
}

export function sessionDeliveryHref(
  projectRef: string,
  sessionRef: string,
): string {
  return `/admin/projects/${projectRef}/sessions/${sessionRef}?step=delivery`;
}

export function sessionShootDayHref(
  projectRef: string,
  sessionRef: string,
): string {
  return `/admin/projects/${projectRef}/sessions/${sessionRef}?step=shoot-day`;
}

export function sessionPrepHref(projectRef: string, sessionRef: string): string {
  return `/admin/projects/${projectRef}/sessions/${sessionRef}?step=prep`;
}

/** Pretty project/session href when entities (or ids) are known. */
export function sessionToolsHref(opts: {
  project: { id: string; adminSlug?: string };
  session: { id: string; adminSlug?: string };
  step?: "prep" | "shoot-day" | "delivery" | "wrap";
}): string {
  const base = sessionHref(
    adminPathSegment(opts.project),
    adminPathSegment(opts.session),
  );
  return opts.step ? `${base}?step=${opts.step}` : base;
}

export function bookingsHref(): string {
  return "/admin/bookings";
}

export function paymentsHref(): string {
  return "/admin/payments";
}

/**
 * Notify deep-link for contact / inbound (AURA-419 / AURA-421).
 * Project-scoped → project Messages trail; else New project (optional contact prefill).
 */
export function contactNotifyHref(opts?: {
  projectId?: string | null;
  sessionId?: string | null;
  contactMessageId?: string | null;
}): string {
  const projectId = String(opts?.projectId || "").trim();
  const sessionId = String(opts?.sessionId || "").trim();
  const contactMessageId = String(opts?.contactMessageId || "").trim();
  if (projectId && sessionId) return sessionMessagesHref(projectId, sessionId);
  if (projectId) return projectMessagesHref(projectId);
  if (contactMessageId) {
    return `/admin/projects?new=1&contact=${encodeURIComponent(contactMessageId)}`;
  }
  return "/admin/projects?new=1";
}

/** @deprecated Prefer contactNotifyHref. */
export function dashboardMessagesHref(): string {
  return "/admin/projects?new=1";
}

/** Prefer session delivery when both ids known; else project workflow. */
export function projectOrSessionDeliveryHref(opts: {
  projectId?: string | null;
  sessionId?: string | null;
  projectSlug?: string | null;
  sessionSlug?: string | null;
  fallback?: string;
}): string {
  const projectRef = (opts.projectSlug || opts.projectId || "").trim();
  const sessionRef = (opts.sessionSlug || opts.sessionId || "").trim();
  if (projectRef && sessionRef) return sessionDeliveryHref(projectRef, sessionRef);
  if (projectRef) return projectWorkflowHref(projectRef);
  return opts.fallback || paymentsHref();
}
