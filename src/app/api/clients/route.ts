import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { withApiDeprecation } from "@/lib/api-deprecation";
import { requireAdmin } from "@/lib/auth";
import { readStudioDb, updateStudioDb } from "@/lib/db/store";
import { publicToken } from "@/lib/tokens";
import type { Project } from "@/lib/types";

/** @deprecated Use `/api/projects` (AURA-273). */
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await readStudioDb(admin.studioId);
  return withApiDeprecation(
    NextResponse.json({
      clients: db.projects,
      projects: db.projects,
    }),
    "/api/projects",
  );
}

/** @deprecated Use `/api/projects` (AURA-273). */
export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  if (!body.name) {
    return NextResponse.json(
      { error: "Name required" },
      { status: 400 },
    );
  }
  const now = new Date().toISOString();
  const project: Project = {
    id: nanoid(),
    studioId: admin.studioId,
    name: String(body.name),
    email: body.email ? String(body.email) : "",
    phone: body.phone ? String(body.phone) : undefined,
    notes: body.notes ? String(body.notes) : undefined,
    type: body.type ? String(body.type) : "Session",
    stage: body.stage || "inquiry",
    projectDate: body.projectDate ? String(body.projectDate) : undefined,
    paidAmount: typeof body.paidAmount === "number" ? body.paidAmount : 0,
    cancelToken: publicToken(24),
    createdAt: now,
    updatedAt: now,
  };
  await updateStudioDb(admin.studioId, (db) => {
    db.projects.unshift(project);
  });
  return withApiDeprecation(
    NextResponse.json({ client: project, project }),
    "/api/projects",
  );
}
