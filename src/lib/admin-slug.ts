import type { AuraDatabase, Project, ProjectSession } from "@/lib/types";

/** Max length for admin path segments (AURA-370). */
const MAX_SLUG_LEN = 48;

/**
 * Normalize a human label into an admin URL segment.
 * Empty input → "".
 */
export function normalizeAdminSlug(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_SLUG_LEN)
    .replace(/-+$/g, "");
}

/** Path segment: prefer slug, always fall back to id. */
export function adminPathSegment(
  entity: { id: string; adminSlug?: string } | null | undefined,
): string {
  if (!entity) return "";
  const slug = entity.adminSlug?.trim();
  return slug || entity.id;
}

export function findProjectByRef(
  db: Pick<AuraDatabase, "projects">,
  ref: string,
): Project | null {
  const key = ref.trim();
  if (!key) return null;
  const byId = db.projects.find((p) => p.id === key);
  if (byId) return byId;
  const slug = normalizeAdminSlug(key);
  if (!slug) return null;
  return db.projects.find((p) => p.adminSlug === slug) || null;
}

export function findSessionByRef(
  db: Pick<AuraDatabase, "sessions">,
  ref: string,
  opts?: { projectId?: string },
): ProjectSession | null {
  const key = ref.trim();
  if (!key) return null;
  const byId = db.sessions.find((s) => s.id === key);
  if (byId) {
    if (opts?.projectId && byId.projectId !== opts.projectId) return null;
    return byId;
  }
  const slug = normalizeAdminSlug(key);
  if (!slug) return null;
  const matches = db.sessions.filter((s) => {
    if (s.adminSlug !== slug) return false;
    if (opts?.projectId && s.projectId !== opts.projectId) return false;
    return true;
  });
  return matches[0] || null;
}

function takenProjectSlugs(
  db: Pick<AuraDatabase, "projects">,
  exceptId?: string,
): Set<string> {
  const set = new Set<string>();
  for (const p of db.projects) {
    if (exceptId && p.id === exceptId) continue;
    if (p.adminSlug) set.add(p.adminSlug);
  }
  return set;
}

function takenSessionSlugs(
  db: Pick<AuraDatabase, "sessions">,
  projectId: string,
  exceptId?: string,
): Set<string> {
  const set = new Set<string>();
  for (const s of db.sessions) {
    if (s.projectId !== projectId) continue;
    if (exceptId && s.id === exceptId) continue;
    if (s.adminSlug) set.add(s.adminSlug);
  }
  return set;
}

/** Unique slug within studio projects. */
export function allocateProjectAdminSlug(
  db: Pick<AuraDatabase, "projects">,
  name: string,
  exceptId?: string,
): string {
  const base = normalizeAdminSlug(name) || "project";
  const taken = takenProjectSlugs(db, exceptId);
  if (!taken.has(base)) return base;
  for (let i = 2; i < 200; i++) {
    const candidate = `${base.slice(0, MAX_SLUG_LEN - 3)}-${i}`.replace(
      /-+$/g,
      "",
    );
    if (!taken.has(candidate)) return candidate;
  }
  return `${base.slice(0, 40)}-${Date.now().toString(36)}`;
}

/** Unique slug within a project's sessions. */
export function allocateSessionAdminSlug(
  db: Pick<AuraDatabase, "sessions">,
  projectId: string,
  type: string,
  exceptId?: string,
): string {
  const base = normalizeAdminSlug(type) || "session";
  const taken = takenSessionSlugs(db, projectId, exceptId);
  if (!taken.has(base)) return base;
  for (let i = 2; i < 200; i++) {
    const candidate = `${base.slice(0, MAX_SLUG_LEN - 3)}-${i}`.replace(
      /-+$/g,
      "",
    );
    if (!taken.has(candidate)) return candidate;
  }
  return `${base.slice(0, 40)}-${Date.now().toString(36)}`;
}

/** Assign adminSlug when missing (in-memory; caller persists). */
export function ensureProjectAdminSlug(
  db: Pick<AuraDatabase, "projects">,
  project: Project,
): string {
  if (project.adminSlug?.trim()) return project.adminSlug;
  const slug = allocateProjectAdminSlug(db, project.name, project.id);
  project.adminSlug = slug;
  return slug;
}

/** Assign adminSlug when missing (in-memory; caller persists). */
export function ensureSessionAdminSlug(
  db: Pick<AuraDatabase, "sessions">,
  session: ProjectSession,
): string {
  if (session.adminSlug?.trim()) return session.adminSlug;
  const slug = allocateSessionAdminSlug(
    db,
    session.projectId,
    session.type,
    session.id,
  );
  session.adminSlug = slug;
  return slug;
}
