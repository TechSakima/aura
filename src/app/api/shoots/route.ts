import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { withApiDeprecation } from "@/lib/api-deprecation";
import { requireAdmin } from "@/lib/auth";
import { readStudioDb, updateStudioDb } from "@/lib/db/store";
import {
  defaultSessionEndsAt,
  pushSessionToGoogleCalendar,
} from "@/lib/google-calendar";
import type { ProjectSession, ShootStatus } from "@/lib/types";

/** @deprecated Use `/api/sessions` (AURA-273). */
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await readStudioDb(admin.studioId);
  return withApiDeprecation(
    NextResponse.json({
      shoots: db.sessions.map((s) => ({
        ...s,
        clientId: s.projectId,
        shootDate: s.startsAt,
      })),
      sessions: db.sessions,
      clients: db.projects,
      projects: db.projects,
    }),
    "/api/sessions",
  );
}

/** @deprecated Use `/api/sessions` (AURA-273). */
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

  const shoot = {
    ...session,
    clientId: session.projectId,
    shootDate: session.startsAt,
  };
  return withApiDeprecation(
    NextResponse.json({
      shoot,
      session,
      calendarSyncFailed: calendarSyncFailed || undefined,
    }),
    "/api/sessions",
  );
}
