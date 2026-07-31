import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import {
  ensureProjectAdminSlug,
  findProjectByRef,
} from "@/lib/admin-slug";
import {
  archiveProject,
  deleteProjectCascade,
  unarchiveProject,
} from "@/lib/db/delete-project";
import { cascadeProjectRename } from "@/lib/db/rename-project";
import {
  countPhotosByGalleryId,
  getClientBundle,
  readStudioDb,
  updateStudioDb,
} from "@/lib/db/store";
import { deriveWizardProgress } from "@/lib/wizard/steps";
import type { ProjectStage } from "@/lib/types";
import { isProjectWorkflowStep } from "@/lib/workflow/path";

const LIGHT_STUDIO: { photos: false; analytics: false } = {
  photos: false,
  analytics: false,
};

async function resolveProjectId(
  studioId: string,
  ref: string,
): Promise<string | null> {
  const db = await readStudioDb(studioId, LIGHT_STUDIO);
  const project = findProjectByRef(db, ref);
  if (!project) return null;
  if (!project.adminSlug) {
    await updateStudioDb(studioId, (d) => {
      const p = d.projects.find((x) => x.id === project.id);
      if (p) ensureProjectAdminSlug(d, p);
    });
  }
  return project.id;
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: ref } = await ctx.params;
  const projectId = await resolveProjectId(admin.studioId, ref);
  if (!projectId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const bundle = await getClientBundle(projectId);
  if (!bundle || bundle.client.studioId !== admin.studioId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const db = await readStudioDb(admin.studioId, LIGHT_STUDIO);
  const project =
    db.projects.find((p) => p.id === projectId) || bundle.client;
  const sessionRows = bundle.shoots || [];
  const sessions = await Promise.all(
    sessionRows.map(async (s) => {
      const session = db.sessions.find((x) => x.id === s.id);
      const proposal = session?.proposalId
        ? db.proposals.find((p) => p.id === session.proposalId)
        : db.proposals.find((p) => (p.sessionId || p.shootId) === s.id);
      const plan = db.shootPlans.find(
        (p) => p.sessionId === s.id || p.shootId === s.id,
      );
      const gallery = session?.galleryId
        ? db.galleries.find((g) => g.id === session.galleryId)
        : db.galleries.find((g) => (g.sessionId || g.shootId) === s.id);
      const photoCount = gallery
        ? await countPhotosByGalleryId(gallery.id)
        : 0;
      const progress = deriveWizardProgress({
        shoot: session || s,
        proposal: proposal || null,
        plan: plan || null,
        gallery: gallery || null,
        photoCount,
      });
      return {
        ...(session || s),
        currentStep: progress.currentStep,
        label: progress.currentStep.replace("-", " "),
        quoteToken: proposal?.token,
        galleryToken: gallery?.publicToken,
        galleryStatus: gallery?.status,
        prepComplete: progress.completed.includes("prep"),
        deliveryComplete: progress.completed.includes("delivery"),
        photoCount,
      };
    }),
  );

  const needsSessionSlugs = sessions.some((s) => !s.adminSlug);
  if (needsSessionSlugs) {
    const { ensureSessionAdminSlug } = await import("@/lib/admin-slug");
    await updateStudioDb(admin.studioId, (d) => {
      for (const s of d.sessions) {
        if (s.projectId === projectId) ensureSessionAdminSlug(d, s);
      }
    });
    const refreshed = await readStudioDb(admin.studioId, LIGHT_STUDIO);
    for (const row of sessions) {
      const live = refreshed.sessions.find((x) => x.id === row.id);
      if (live?.adminSlug) row.adminSlug = live.adminSlug;
    }
  }

  return NextResponse.json({
    project: db.projects.find((p) => p.id === projectId) || project,
    sessions,
  });
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: ref } = await ctx.params;
  const id = await resolveProjectId(admin.studioId, ref);
  if (!id) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = await req.json();

  if (body.stage === "archived") {
    const ok = await archiveProject(admin.studioId, id);
    if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const bundle = await getClientBundle(id);
    return NextResponse.json({ project: bundle?.client });
  }

  if (body.unarchive === true) {
    const ok = await unarchiveProject(admin.studioId, id);
    if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const bundle = await getClientBundle(id);
    return NextResponse.json({ project: bundle?.client });
  }

  if (body.workflowStep != null && !isProjectWorkflowStep(body.workflowStep)) {
    return NextResponse.json(
      { error: "Invalid workflow step" },
      { status: 400 },
    );
  }

  const project = await updateStudioDb(admin.studioId, (db) => {
    const c = db.projects.find((x) => x.id === id);
    if (!c) return null;
    if (body.name != null) {
      const nextName = String(body.name).trim();
      if (nextName && nextName !== c.name) {
        const renameMode =
          body.renameTitles === "all" || body.updateCustomTitles === true
            ? "all"
            : "auto";
        cascadeProjectRename(db, id, c.name, nextName, renameMode);
        c.name = nextName;
      }
    }
    if (body.email != null) c.email = String(body.email).trim();
    if (body.phone !== undefined) c.phone = body.phone ? String(body.phone) : undefined;
    if (body.notes !== undefined) c.notes = body.notes ? String(body.notes) : undefined;
    if (body.type != null) c.type = String(body.type);
    if (body.stage != null && body.stage !== "archived") {
      c.stage = body.stage as ProjectStage;
    }
    if (body.workflowStep != null) {
      c.workflowStep = body.workflowStep;
    }
    ensureProjectAdminSlug(db, c);
    c.updatedAt = new Date().toISOString();
    return c;
  });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ project });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: ref } = await ctx.params;
  const id = await resolveProjectId(admin.studioId, ref);
  if (!id) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const ok = await deleteProjectCascade(admin.studioId, id);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
