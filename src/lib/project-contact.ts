/** Walk-in / phone-only projects may omit email until a send action (AURA-131). */

export function projectEmail(project: { email?: string | null }): string {
  return String(project.email || "").trim();
}

export function hasProjectEmail(project: { email?: string | null }): boolean {
  const email = projectEmail(project);
  return email.includes("@");
}

/** Sparse API/UI copy when a send needs a contact address. */
export const PROJECT_EMAIL_REQUIRED = "Add an email on the project";
