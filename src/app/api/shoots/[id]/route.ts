import { NextResponse } from "next/server";
import { withApiDeprecation } from "@/lib/api-deprecation";
import { requireAdmin } from "@/lib/auth";
import { deleteShootCascade } from "@/lib/db/delete-shoot";
import { getShootBundle, updateStudioDb } from "@/lib/db/store";
import {
  defaultSessionEndsAt,
  deleteGoogleCalendarEvent,
  pushSessionToGoogleCalendar,
  updateGoogleCalendarEvent,
} from "@/lib/google-calendar";
import type { ShootStatus } from "@/lib/types";

function dep(res: NextResponse, id: string) {
  return withApiDeprecation(res, `/api/sessions/${id}`);
}

/** @deprecated Use `/api/sessions/[id]` (AURA-273). */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const bundle = await getShootBundle(id);
  if (!bundle || bundle.shoot.studioId !== admin.studioId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const gallery = bundle.gallery
    ? (() => {
        const { downloadPinHash: _, ...safe } = bundle.gallery;
        return safe;
      })()
    : null;
  return dep(
    NextResponse.json({
      shoot: bundle.shoot,
      client: bundle.client,
      gallery,
    }),
    id,
  );
}

/** @deprecated Use `/api/sessions/[id]` (AURA-273). */
export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const body = await req.json();

  let prevEventId: string | undefined;
  let prevStartsAt: string | undefined;
  let prevEndsAt: string | undefined;
  let prevType: string | undefined;
  let timesChanged = false;
  let typeChanged = false;

  const shoot = await updateStudioDb(admin.studioId, (db) => {
    const s = db.sessions.find((x) => x.id === id);
    if (!s) return null;
    prevEventId = s.googleEventId;
    prevStartsAt = s.startsAt;
    prevEndsAt = s.endsAt;
    prevType = s.type;
    if (body.type != null) s.type = String(body.type);
    if (body.startsAt !== undefined || body.shootDate !== undefined) {
      const raw = body.startsAt ?? body.shootDate;
      s.startsAt = raw ? String(raw) : undefined;
    }
    if (body.endsAt !== undefined) {
      s.endsAt = body.endsAt ? String(body.endsAt) : undefined;
    }
    // Manual sessions often set start only — keep a usable end for calendar/busy.
    if (s.startsAt && !s.endsAt) {
      s.endsAt = defaultSessionEndsAt(s.startsAt);
    }
    timesChanged =
      s.startsAt !== prevStartsAt || s.endsAt !== prevEndsAt;
    typeChanged = s.type !== prevType;
    if (body.proposalId !== undefined) {
      s.proposalId = body.proposalId ? String(body.proposalId) : undefined;
    }
    if (body.galleryId !== undefined) {
      s.galleryId = body.galleryId ? String(body.galleryId) : undefined;
    }
    if (body.googleEventId !== undefined) {
      s.googleEventId = body.googleEventId
        ? String(body.googleEventId)
        : undefined;
    }
    if (body.intakeAnswers !== undefined) {
      s.intakeAnswers =
        body.intakeAnswers &&
        typeof body.intakeAnswers === "object" &&
        !Array.isArray(body.intakeAnswers)
          ? (body.intakeAnswers as Record<string, string>)
          : undefined;
    }
    if (body.status != null) s.status = body.status as ShootStatus;
    if (body.wizardSkippedProposal != null) {
      s.wizardSkippedProposal = Boolean(body.wizardSkippedProposal);
    }
    if (body.wizardSkippedPrep != null) {
      s.wizardSkippedPrep = Boolean(body.wizardSkippedPrep);
    }
    if (body.wizardAdvancedPastShootDay != null) {
      s.wizardAdvancedPastShootDay = Boolean(body.wizardAdvancedPastShootDay);
    }
    s.updatedAt = new Date().toISOString();
    return s;
  });
  if (!shoot) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let calendarSyncFailed = false;
  const eventId = shoot.googleEventId || prevEventId;

  if (timesChanged || typeChanged) {
    if (eventId && shoot.startsAt && shoot.endsAt) {
      const updated = await updateGoogleCalendarEvent({
        studioId: admin.studioId,
        eventId,
        title: shoot.type,
        startsAt: shoot.startsAt,
        endsAt: shoot.endsAt,
      });
      calendarSyncFailed = updated.failed;
    } else if (eventId && (!shoot.startsAt || !shoot.endsAt)) {
      const deleted = await deleteGoogleCalendarEvent({
        studioId: admin.studioId,
        eventId,
      });
      calendarSyncFailed = deleted.failed;
      if (!deleted.failed) {
        await updateStudioDb(admin.studioId, (db) => {
          const s = db.sessions.find((x) => x.id === id);
          if (s) s.googleEventId = undefined;
        });
        shoot.googleEventId = undefined;
      }
    } else if (!eventId && shoot.startsAt && shoot.endsAt) {
      const pushed = await pushSessionToGoogleCalendar({
        studioId: admin.studioId,
        title: shoot.type,
        startsAt: shoot.startsAt,
        endsAt: shoot.endsAt,
      });
      if (pushed.eventId) {
        shoot.googleEventId = pushed.eventId;
        await updateStudioDb(admin.studioId, (db) => {
          const s = db.sessions.find((x) => x.id === id);
          if (s) s.googleEventId = pushed.eventId!;
        });
      }
      if (pushed.failed) calendarSyncFailed = true;
    }
  }

  return dep(
    NextResponse.json({
      shoot,
      calendarSyncFailed: calendarSyncFailed || undefined,
    }),
    id,
  );
}

/** @deprecated Use `/api/sessions/[id]` (AURA-273). */
export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const bundle = await getShootBundle(id);
  const eventId =
    bundle?.shoot.studioId === admin.studioId
      ? bundle.shoot.googleEventId
      : undefined;
  const ok = await deleteShootCascade(admin.studioId, id);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (eventId) {
    await deleteGoogleCalendarEvent({
      studioId: admin.studioId,
      eventId,
    });
  }
  return dep(NextResponse.json({ ok: true, deleted: id }), id);
}
