import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { requireAdmin } from "@/lib/auth";
import { readStudioDb, updateStudioDb } from "@/lib/db/store";
import { toDurationMinutes } from "@/lib/session-duration";
import type { SessionDurationUnit, SessionType } from "@/lib/types";

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

  const hiddenSessionIds = new Set(
    db.bookingRequests
      .filter((r) => r.status === "declined" || r.status === "canceled")
      .map((r) => r.sessionId)
      .filter((id): id is string => Boolean(id)),
  );
  const canceledProjectIds = new Set(
    db.projects.filter((p) => p.stage === "canceled").map((p) => p.id),
  );

  const sessions = db.sessions
    .filter((s) => {
      if (s.status === "archived") return false;
      if (canceledProjectIds.has(s.projectId)) return false;
      if (hiddenSessionIds.has(s.id)) return false;
      return true;
    })
    .map((s) => {
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
    questionnaireTemplates: db.questionnaireTemplates.map((t) => ({
      id: t.id,
      name: t.name,
    })),
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
  const durationUnit: SessionDurationUnit =
    body.durationUnit === "hours" || body.durationUnit === "days"
      ? body.durationUnit
      : "minutes";
  const durationValue =
    body.durationValue !== undefined && body.durationValue !== null
      ? Number(body.durationValue)
      : Number(body.durationMinutes) || 60;
  const sessionType: SessionType = {
    id: nanoid(),
    studioId: admin.studioId,
    name,
    durationMinutes: toDurationMinutes(durationValue, durationUnit),
    durationUnit,
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

export async function PATCH(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const id = String(body.id || "");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }
  const sessionType = await updateStudioDb(admin.studioId, (db) => {
    const t = db.sessionTypes.find((x) => x.id === id);
    if (!t) return null;
    const now = new Date().toISOString();
    if (typeof body.name === "string" && body.name.trim()) {
      t.name = body.name.trim();
    }
    if (body.durationValue != null || body.durationMinutes != null) {
      const unit: SessionDurationUnit =
        body.durationUnit === "hours" || body.durationUnit === "days"
          ? body.durationUnit
          : t.durationUnit || "minutes";
      const value =
        body.durationValue !== undefined && body.durationValue !== null
          ? Number(body.durationValue)
          : Number(body.durationMinutes);
      if (Number.isFinite(value)) {
        t.durationMinutes = toDurationMinutes(value, unit);
        t.durationUnit = unit;
      }
    } else if (
      body.durationUnit === "hours" ||
      body.durationUnit === "days" ||
      body.durationUnit === "minutes"
    ) {
      t.durationUnit = body.durationUnit;
    }
    if (body.basePrice != null && Number.isFinite(Number(body.basePrice))) {
      t.basePrice = Number(body.basePrice);
    }
    if (body.bufferMinutes != null && Number.isFinite(Number(body.bufferMinutes))) {
      t.bufferMinutes = Number(body.bufferMinutes);
    }
    if (body.pricingMode === "upfront" || body.pricingMode === "after_intake") {
      t.pricingMode = body.pricingMode;
    }
    if (body.depositAmount !== undefined) {
      if (body.depositAmount === null || body.depositAmount === "") {
        t.depositAmount = undefined;
      } else {
        const n = Number(body.depositAmount);
        t.depositAmount = Number.isFinite(n) ? n : t.depositAmount;
      }
    }
    if (body.questionnaireTemplateId !== undefined) {
      const qid = String(body.questionnaireTemplateId || "").trim();
      t.questionnaireTemplateId = qid || undefined;
    }
    if (typeof body.active === "boolean") t.active = body.active;
    if (body.description !== undefined) {
      t.description = body.description
        ? String(body.description)
        : undefined;
    }
    t.updatedAt = now;
    return t;
  });
  if (!sessionType) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ sessionType });
}
