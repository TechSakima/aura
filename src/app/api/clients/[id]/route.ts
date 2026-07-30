import { NextResponse } from "next/server";
import { withApiDeprecation } from "@/lib/api-deprecation";
import { requireAdmin } from "@/lib/auth";
import {
  archiveProject,
  deleteProjectCascade,
  unarchiveProject,
} from "@/lib/db/delete-project";
import { cascadeProjectRename } from "@/lib/db/rename-project";
import { getClientBundle, updateStudioDb } from "@/lib/db/store";
import type { ProjectStage } from "@/lib/types";
import { isProjectWorkflowStep } from "@/lib/workflow/path";

function dep(res: NextResponse, id: string) {
  return withApiDeprecation(res, `/api/projects/${id}`);
}

/** @deprecated Use `/api/projects/[id]` (AURA-273). */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const bundle = await getClientBundle(id);
  if (!bundle || bundle.client.studioId !== admin.studioId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return dep(NextResponse.json(bundle), id);
}

/** @deprecated Use `/api/projects/[id]` (AURA-273). */
export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const body = await req.json();

  if (body.stage === "archived") {
    const ok = await archiveProject(admin.studioId, id);
    if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const bundle = await getClientBundle(id);
    return dep(
      NextResponse.json({
        client: bundle?.client,
        project: bundle?.client,
      }),
      id,
    );
  }

  if (body.unarchive === true) {
    const ok = await unarchiveProject(admin.studioId, id);
    if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const bundle = await getClientBundle(id);
    return dep(
      NextResponse.json({
        client: bundle?.client,
        project: bundle?.client,
      }),
      id,
    );
  }

  if (body.workflowStep != null && !isProjectWorkflowStep(body.workflowStep)) {
    return NextResponse.json(
      { error: "Invalid workflow step" },
      { status: 400 },
    );
  }

  const client = await updateStudioDb(admin.studioId, (db) => {
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
    if (body.email != null) c.email = String(body.email);
    if (body.phone !== undefined) c.phone = body.phone ? String(body.phone) : undefined;
    if (body.notes !== undefined) c.notes = body.notes ? String(body.notes) : undefined;
    if (body.type != null) c.type = String(body.type);
    if (body.stage != null && body.stage !== "archived") {
      c.stage = body.stage as ProjectStage;
    }
    if (body.workflowStep != null) {
      c.workflowStep = body.workflowStep;
    }
    c.updatedAt = new Date().toISOString();
    return c;
  });
  if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return dep(NextResponse.json({ client, project: client }), id);
}

/** @deprecated Use `/api/projects/[id]` (AURA-273). */
export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const ok = await deleteProjectCascade(admin.studioId, id);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return dep(NextResponse.json({ ok: true }), id);
}
