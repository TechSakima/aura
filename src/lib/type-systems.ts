/**
 * Type systems map (AURA-187 / AURA-072).
 *
 * Distinct fields — do not conflate in UI:
 *
 * | Field | Admin label | Role |
 * |-------|-------------|------|
 * | `project.type` | Project type | Job category (Wedding, Portrait…) |
 * | `session.type` | Session label | This session occurrence |
 * | `shotListTemplate.shootType` | Applies to | Shot list filter (match session.label vocabulary) |
 * | booking `SessionType` | Session type | Bookable offering (duration, price, deposit) |
 *
 * Rule: `session.type` and `project.type` share a vocabulary; booking
 * `sessionType.name` often becomes `session.type` on confirm.
 */
export const TYPE_SYSTEMS_VERSION = 1;
