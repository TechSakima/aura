/**
 * Type systems map (AURA-187).
 *
 * Distinct fields — do not conflate:
 * - `project.type` — job category (Wedding, Portrait, etc.). Display/sort only.
 * - `session.type` — label for this session occurrence (same vocabulary as project.type usually).
 * - `shotListTemplate.shootType` — which session types this shot list applies to (matches session.type).
 * - `sessionType.id` (booking) — public bookable offering (duration, price, deposit); links to session.type when creating session.
 *
 * Rule: `session.type` and `project.type` share a vocabulary; `sessionType.name` (booking) maps to a session.type on confirm.
 */
export const TYPE_SYSTEMS_VERSION = 1;
