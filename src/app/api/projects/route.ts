import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { requireAdmin } from "@/lib/auth";
import { readStudioDb, updateStudioDb } from "@/lib/db/store";
import { publicToken } from "@/lib/tokens";
import type { Project } from "@/lib/types";

/** Canonical projects list/create (AURA-155). `sessions` summary avoids N wizard calls. */
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await readStudioDb(admin.studioId);
  const sessionsByProject = new Map<string, typeof db.sessions>();
  for (const s of db.sessions) {
    const list = sessionsByProject.get(s.projectId) || [];
    list.push(s);
    sessionsByProject.set(s.projectId, list);
  }
  return NextResponse.json({
    projects: db.projects.map((p) => ({
      ...p,
      sessions: sessionsByProject.get(p.id) || [],
    })),
  });
}

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
    email: String(body.email),
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
  return NextResponse.json({ project, sessions: [] });
}
