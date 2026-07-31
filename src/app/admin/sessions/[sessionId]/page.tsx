import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import {
  adminPathSegment,
  ensureProjectAdminSlug,
  ensureSessionAdminSlug,
  findSessionByRef,
} from "@/lib/admin-slug";
import { readStudioDb, updateStudioDb } from "@/lib/db/store";

/**
 * Session-first admin entry (AURA-370).
 * `/admin/sessions/{id|slug}` → project/session path (pretty when slugs exist).
 */
export default async function SessionFirstRedirectPage({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const admin = await requireAdmin();
  if (!admin) redirect("/admin/login");

  const { sessionId: ref } = await params;
  const query = await searchParams;
  let db = await readStudioDb(admin.studioId);
  let session = findSessionByRef(db, ref);
  if (!session) redirect("/admin/projects");

  if (!session.adminSlug) {
    await updateStudioDb(admin.studioId, (d) => {
      const s = d.sessions.find((x) => x.id === session!.id);
      if (s) ensureSessionAdminSlug(d, s);
      const p = d.projects.find((x) => x.id === session!.projectId);
      if (p) ensureProjectAdminSlug(d, p);
    });
    db = await readStudioDb(admin.studioId);
    session = db.sessions.find((s) => s.id === session!.id) || session;
  }

  const project = db.projects.find((p) => p.id === session.projectId);
  if (!project) redirect("/admin/projects");
  if (!project.adminSlug) {
    await updateStudioDb(admin.studioId, (d) => {
      const p = d.projects.find((x) => x.id === project.id);
      if (p) ensureProjectAdminSlug(d, p);
    });
    db = await readStudioDb(admin.studioId);
  }
  const liveProject =
    db.projects.find((p) => p.id === session.projectId) || project;
  const liveSession =
    db.sessions.find((s) => s.id === session.id) || session;

  const step = typeof query.step === "string" ? query.step : "";
  const qs = step ? `?step=${encodeURIComponent(step)}` : "";
  redirect(
    `/admin/projects/${adminPathSegment(liveProject)}/sessions/${adminPathSegment(liveSession)}${qs}`,
  );
}
