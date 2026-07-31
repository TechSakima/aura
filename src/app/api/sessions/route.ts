import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { requireAdmin } from "@/lib/auth";
import { allocateSessionAdminSlug } from "@/lib/admin-slug";
import { readStudioDb, updateStudioDb } from "@/lib/db/store";
import {
  defaultSessionEndsAt,
  pushSessionToGoogleCalendar,
} from "@/lib/google-calendar";
import { normalizeSessionStartsAt } from "@/lib/validation/session-datetime";
import type { ProjectSession, ShootStatus } from "@/lib/types";

/** Canonical sessions list/create (AURA-156). `projectId` + `startsAt` only. */
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await readStudioDb(admin.studioId);
  return NextResponse.json({
    sessions: db.sessions,
    projects: db.projects,
  });
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const projectId = String(body.projectId || "");
  if (!projectId || !body.type) {
    return NextResponse.json(
      { error: "projectId and type required" },
      { status: 400 },
    );
  }
  const now = new Date().toISOString();
  const normalizedStart = normalizeSessionStartsAt(body.startsAt);
  if (normalizedStart === null) {
    return NextResponse.json(
      { error: "startsAt must be ISO datetime or YYYY-MM-DD" },
      { status: 400 },
    );
  }
  const startsAt = normalizedStart;
  const endsAt = body.endsAt
    ? String(body.endsAt)
    : startsAt
      ? defaultSessionEndsAt(startsAt)
      : undefined;
  const session: ProjectSession = {
    id: nanoid(),
    studioId: admin.studioId,
    projectId,
    type: String(body.type),
    startsAt,
    endsAt,
    status: (body.status as ShootStatus) || "inquiry",
    createdAt: now,
    updatedAt: now,
  };
  await updateStudioDb(admin.studioId, (db) => {
    session.adminSlug = allocateSessionAdminSlug(
      db,
      projectId,
      session.type,
      session.id,
    );
    db.sessions.unshift(session);
  });

  let calendarSyncFailed = false;
  if (startsAt && endsAt) {
    const pushed = await pushSessionToGoogleCalendar({
      studioId: admin.studioId,
      title: session.type,
      startsAt,
      endsAt,
    });
    if (pushed.eventId) {
      session.googleEventId = pushed.eventId;
      await updateStudioDb(admin.studioId, (db) => {
        const s = db.sessions.find((x) => x.id === session.id);
        if (s) s.googleEventId = pushed.eventId!;
      });
    }
    if (pushed.failed) calendarSyncFailed = true;
  }

  return NextResponse.json({
    session,
    calendarSyncFailed: calendarSyncFailed || undefined,
  });
}
