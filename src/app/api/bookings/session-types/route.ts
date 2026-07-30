import { requireAdmin } from "@/lib/auth";
import {
  parseAdminListPage,
  slicePage,
} from "@/lib/admin-list-page";
import {
  clampBufferMinutes,
  studioBookingDefaults,
} from "@/lib/booking-defaults";
import {
  getStudioDoc,
  listBookingRequestsForStudio,
  listProjectsForStudio,
  listQuestionnaireTemplatesForStudio,
  listSessionsForStudio,
  listSessionTypesForStudio,
  updateStudioDb,
} from "@/lib/db/store";
import { studioGoogleCalendarReady } from "@/lib/google-calendar";
import { toDurationMinutes } from "@/lib/session-duration";
import type { SessionDurationUnit, SessionType } from "@/lib/types";
import { NextResponse } from "next/server";
import { nanoid } from "nanoid";

/**
 * Bookings list + session-type CRUD.
 * AURA-268: scoped collection reads; paginated request history; calendar view skips requests.
 */
export async function GET(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const view = url.searchParams.get("view") || "all";

  // Cheap shell badge poll (AURA-066) — no studio graph.
  if (view === "badges") {
    const bookingRequests = await listBookingRequestsForStudio(admin.studioId);
    const pendingCount = bookingRequests.filter(
      (r) => r.status === "pending",
    ).length;
    return NextResponse.json({ pendingCount });
  }

  const studio = await getStudioDoc(admin.studioId);
  if (!studio) {
    return NextResponse.json({ error: "Studio not found" }, { status: 404 });
  }

  const gcalConnected = studioGoogleCalendarReady(studio);
  const homepageSlug = studio.homepage?.slug;

  if (view === "calendar") {
    const [projects, sessions, bookingRequests] = await Promise.all([
      listProjectsForStudio(admin.studioId),
      listSessionsForStudio(admin.studioId),
      listBookingRequestsForStudio(admin.studioId),
    ]);
    const projectById = new Map(projects.map((p) => [p.id, p]));
    const hiddenSessionIds = new Set(
      bookingRequests
        .filter((r) => r.status === "declined" || r.status === "canceled")
        .map((r) => r.sessionId)
        .filter((id): id is string => Boolean(id)),
    );
    const canceledProjectIds = new Set(
      projects.filter((p) => p.stage === "canceled").map((p) => p.id),
    );
    const calendarSessions = sessions
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
          projectHref: `/admin/projects/${s.projectId}#workflow`,
        };
      });

    return NextResponse.json({
      sessions: calendarSessions,
      bookingRequests: [],
      sessionTypes: [],
      homepageSlug,
      gcalConnected,
      questionnaireTemplates: [],
    });
  }

  const [projects, sessionTypes, bookingRequests, qTemplates] =
    await Promise.all([
      listProjectsForStudio(admin.studioId),
      listSessionTypesForStudio(admin.studioId),
      listBookingRequestsForStudio(admin.studioId),
      listQuestionnaireTemplatesForStudio(admin.studioId),
    ]);
  const projectById = new Map(projects.map((p) => [p.id, p]));
  const sessionTypeById = new Map(sessionTypes.map((t) => [t.id, t]));

  const enriched = bookingRequests
    .map((r) => {
      const project = r.projectId ? projectById.get(r.projectId) : undefined;
      const sessionType = sessionTypeById.get(r.sessionTypeId);
      return {
        ...r,
        sessionTypeName: sessionType?.name || "Session",
        projectName: project?.name || r.name,
        projectStage: project?.stage || "inquiry",
        projectHref: r.projectId
          ? `/admin/projects/${r.projectId}#workflow`
          : undefined,
        sessionHref: r.sessionId
          ? `/admin/shoots/${r.sessionId}/helper`
          : undefined,
      };
    })
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

  const pending = enriched.filter((r) => r.status === "pending");
  const history = enriched.filter((r) => r.status !== "pending");
  const { offset, limit } = parseAdminListPage(url);
  const historyPage = slicePage(history, offset, limit);

  let sessions: unknown[] = [];
  if (view === "all") {
    const allSessions = await listSessionsForStudio(admin.studioId);
    const hiddenSessionIds = new Set(
      bookingRequests
        .filter((r) => r.status === "declined" || r.status === "canceled")
        .map((r) => r.sessionId)
        .filter((id): id is string => Boolean(id)),
    );
    const canceledProjectIds = new Set(
      projects.filter((p) => p.stage === "canceled").map((p) => p.id),
    );
    sessions = allSessions
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
          projectHref: `/admin/projects/${s.projectId}#workflow`,
        };
      });
  }

  return NextResponse.json({
    sessionTypes,
    sessions,
    bookingRequests: [...pending, ...historyPage.items],
    pendingCount: pending.length,
    historyTotal: historyPage.total,
    hasMore: historyPage.hasMore,
    offset,
    limit,
    homepageSlug,
    gcalConnected,
    questionnaireTemplates: qTemplates.map((t) => ({
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
  const studio = await getStudioDoc(admin.studioId);
  if (!studio) {
    return NextResponse.json({ error: "Studio not found" }, { status: 404 });
  }
  const defaults = studioBookingDefaults(studio);
  const now = new Date().toISOString();
  const pricingMode =
    body.pricingMode === "upfront" ? "upfront" : "after_intake";
  const depositRaw =
    body.depositAmount !== undefined &&
    body.depositAmount !== null &&
    body.depositAmount !== ""
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
  const bufferMinutes = clampBufferMinutes(
    body.bufferMinutes != null && Number.isFinite(Number(body.bufferMinutes))
      ? body.bufferMinutes
      : defaults.defaultBufferMinutes,
  );
  const sessionType: SessionType = {
    id: nanoid(),
    studioId: admin.studioId,
    name,
    durationMinutes: toDurationMinutes(durationValue, durationUnit),
    durationUnit,
    bufferMinutes,
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
      t.bufferMinutes = clampBufferMinutes(body.bufferMinutes);
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
