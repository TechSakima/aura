/**
 * Intake answers single home (AURA-175).
 *
 * Canonical storage: `session.intakeAnswers` (Record<string, string>).
 *
 * Writers:
 * - Quote accept (public proposals POST) → session.intakeAnswers = proposal.intakeAnswers
 * - Admin session PATCH → session.intakeAnswers (canonical)
 *
 * Questionnaire responses keep their own `answers` (separate artifact for studio review);
 * prep plan merges session.intakeAnswers (not questionnaire answers) as must-haves.
 *
 * Readers: use session.intakeAnswers; proposals intakeAnswers is legacy mirror for quote form.
 */
export const INTAKE_ANSWERS_RULES_VERSION = 1;
