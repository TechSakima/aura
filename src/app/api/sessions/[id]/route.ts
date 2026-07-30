import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { deleteShootCascade } from "@/lib/db/delete-shoot";
import { getShootBundle, updateStudioDb } from "@/lib/db/store";
import {
  defaultSessionEndsAt,
  deleteGoogleCalendarEvent,
  pushSessionToGoogleCalendar,
  updateGoogleCalendarEvent,
} from "@/lib/google-calendar";
import { normalizeSessionStartsAt } from "@/lib/validation/session-datetime";
import type { ShootStatus } from "@/lib/types";

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
  return NextResponse.json({
    session: bundle.shoot,
    project: bundle.client,
    gallery,
  });
}

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

  if (body.startsAt !== undefined) {
    const normalizedCheck = normalizeSessionStartsAt(body.startsAt);
    if (normalizedCheck === null) {
      return NextResponse.json(
        { error: "startsAt must be ISO datetime or YYYY-MM-DD" },
        { status: 400 },
      );
    }
  }

  const session = await updateStudioDb(admin.studioId, (db) => {
    const s = db.sessions.find((x) => x.id === id);
    if (!s) return null;
    prevEventId = s.googleEventId;
    prevStartsAt = s.startsAt;
    prevEndsAt = s.endsAt;
    prevType = s.type;
    if (body.type != null) s.type = String(body.type);
    if (body.startsAt !== undefined) {
      const normalized = normalizeSessionStartsAt(body.startsAt);
      if (normalized !== null) s.startsAt = normalized;
    }
    if (body.endsAt !== undefined) {
      s.endsAt = body.endsAt ? String(body.endsAt) : undefined;
    }
    if (s.startsAt && !s.endsAt) {
      s.endsAt = defaultSessionEndsAt(s.startsAt);
    }
    timesChanged = s.startsAt !== prevStartsAt || s.endsAt !== prevEndsAt;
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
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let calendarSyncFailed = false;
  const eventId = session.googleEventId || prevEventId;

  if (timesChanged || typeChanged) {
    if (eventId && session.startsAt && session.endsAt) {
      const updated = await updateGoogleCalendarEvent({
        studioId: admin.studioId,
        eventId,
        title: session.type,
        startsAt: session.startsAt,
        endsAt: session.endsAt,
      });
      calendarSyncFailed = updated.failed;
    } else if (eventId && (!session.startsAt || !session.endsAt)) {
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
        session.googleEventId = undefined;
      }
    } else if (!eventId && session.startsAt && session.endsAt) {
      const pushed = await pushSessionToGoogleCalendar({
        studioId: admin.studioId,
        title: session.type,
        startsAt: session.startsAt,
        endsAt: session.endsAt,
      });
      if (pushed.eventId) {
        session.googleEventId = pushed.eventId;
        await updateStudioDb(admin.studioId, (db) => {
          const s = db.sessions.find((x) => x.id === id);
          if (s) s.googleEventId = pushed.eventId!;
        });
      }
      if (pushed.failed) calendarSyncFailed = true;
    }
  }

  return NextResponse.json({
    session,
    calendarSyncFailed: calendarSyncFailed || undefined,
  });
}

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
  return NextResponse.json({ ok: true, deleted: id });
}
