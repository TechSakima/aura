import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { requireAdmin } from "@/lib/auth";
import { readStudioDb, updateStudioDb } from "@/lib/db/store";
import type { ProjectSession, ShootStatus } from "@/lib/types";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await readStudioDb(admin.studioId);
  return NextResponse.json({
    shoots: db.sessions.map((s) => ({
      ...s,
      clientId: s.projectId,
      shootDate: s.startsAt,
    })),
    sessions: db.sessions,
    clients: db.projects,
    projects: db.projects,
  });
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const projectId = String(body.projectId || body.clientId || "");
  if (!projectId || !body.type) {
    return NextResponse.json(
      { error: "projectId (or clientId) and type required" },
      { status: 400 },
    );
  }
  const now = new Date().toISOString();
  const startsAt = body.startsAt
    ? String(body.startsAt)
    : body.shootDate
      ? String(body.shootDate)
      : undefined;
  const session: ProjectSession = {
    id: nanoid(),
    studioId: admin.studioId,
    projectId,
    type: String(body.type),
    startsAt,
    endsAt: body.endsAt ? String(body.endsAt) : undefined,
    status: (body.status as ShootStatus) || "inquiry",
    createdAt: now,
    updatedAt: now,
  };
  await updateStudioDb(admin.studioId, (db) => {
    db.sessions.unshift(session);
  });
  const shoot = {
    ...session,
    clientId: session.projectId,
    shootDate: session.startsAt,
  };
  return NextResponse.json({ shoot, session });
}
