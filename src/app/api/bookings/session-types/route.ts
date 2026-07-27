import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { requireAdmin } from "@/lib/auth";
import { readStudioDb, updateStudioDb } from "@/lib/db/store";
import type { SessionType } from "@/lib/types";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await readStudioDb(admin.studioId);
  const sessionTypeById = new Map(db.sessionTypes.map((t) => [t.id, t]));
  const projectById = new Map(db.projects.map((p) => [p.id, p]));

  const bookingRequests = db.bookingRequests.map((r) => {
    const project = r.projectId ? projectById.get(r.projectId) : undefined;
    const sessionType = sessionTypeById.get(r.sessionTypeId);
    return {
      ...r,
      sessionTypeName: sessionType?.name || "Session",
      projectName: project?.name || r.name,
      projectStage: project?.stage || "inquiry",
      projectHref: r.projectId ? `/admin/projects/${r.projectId}` : undefined,
      sessionHref: r.sessionId
        ? `/admin/shoots/${r.sessionId}/helper`
        : undefined,
    };
  });

  const sessions = db.sessions.map((s) => {
    const project = projectById.get(s.projectId);
    return {
      ...s,
      projectName: project?.name,
      projectHref: `/admin/projects/${s.projectId}`,
    };
  });

  return NextResponse.json({
    sessionTypes: db.sessionTypes,
    sessions,
    bookingRequests,
    homepageSlug: db.studio.homepage?.slug,
    gcalConnected: Boolean(db.studio.googleCalendarConnected),
  });
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const name = String(body.name || "").trim();
  if (!name) {
    return NextResponse.json({ error: "Name required" }, { status: 400 });
  }
  const now = new Date().toISOString();
  const pricingMode =
    body.pricingMode === "upfront" ? "upfront" : "after_intake";
  const depositRaw =
    body.depositAmount !== undefined && body.depositAmount !== null && body.depositAmount !== ""
      ? Number(body.depositAmount)
      : undefined;
  const sessionType: SessionType = {
    id: nanoid(),
    studioId: admin.studioId,
    name,
    durationMinutes: Number(body.durationMinutes) || 60,
    bufferMinutes: Number(body.bufferMinutes) || 15,
    basePrice: Number(body.basePrice) || 0,
    description: body.description ? String(body.description) : undefined,
    pricingMode,
    depositAmount:
      depositRaw !== undefined && Number.isFinite(depositRaw)
        ? depositRaw
        : undefined,
    questionnaireTemplateId: body.questionnaireTemplateId
      ? String(body.questionnaireTemplateId)
      : undefined,
    active: true,
    createdAt: now,
    updatedAt: now,
  };
  await updateStudioDb(admin.studioId, (db) => {
    db.sessionTypes.unshift(sessionType);
  });
  return NextResponse.json({ sessionType });
}
