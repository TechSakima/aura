/**
 * projectDate vs startsAt (AURA-179).
 *
 * - `project.projectDate` — optional calendar date for the job (e.g. wedding date); display/sort on project cards.
 * - `session.startsAt` — ISO datetime for each session occurrence; sort/filter upcoming on dashboard.
 *
 * archiveFlags: dashboard renders expired galleries with admin delivery links (done in 080).
 */
export const PROJECT_DATE_RULES_VERSION = 1;
