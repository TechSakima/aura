import { NextResponse } from "next/server";
import { COL } from "@/lib/db/collections";
import {
  findStudioIdByProjectCancelToken,
  patchStudioDoc,
  readStudioDb,
} from "@/lib/db/store";
import {
  emailStudioBookingCanceled,
  emailStudioBookingRescheduleRequest,
  notifyStudio,
} from "@/lib/notify/send";
import { deleteGoogleCalendarEvent } from "@/lib/google-calendar";
import { clientIp, rateLimitShared } from "@/lib/rate-limit";
import type { CancelPolicy } from "@/lib/types";

function canCancel(opts: {
  policy: CancelPolicy | undefined;
  paidAmount: number;
  startsAt?: string;
}): { ok: boolean; reason?: string } {
  const policy = opts.policy || { untilPayment: true, daysBeforeSession: 7 };
  if (policy.untilPayment !== false && opts.paidAmount > 0) {
    return { ok: false, reason: "Cancel is closed after payment." };
  }
  const days = policy.daysBeforeSession;
  if (days != null && days >= 0 && opts.startsAt) {
    const ms = new Date(opts.startsAt).getTime() - Date.now();
    const daysLeft = ms / (1000 * 60 * 60 * 24);
    if (daysLeft < days) {
      return {
        ok: false,
        reason: `Cancel is closed within ${days} days of the session.`,
      };
    }
  }
  return { ok: true };
}

async function loadCancelContext(token: string) {
  const studioId = await findStudioIdByProjectCancelToken(token);
  if (!studioId) return null;
  const db = await readStudioDb(studioId);
  const project = db.projects.find((p) => p.cancelToken === token);
  if (!project) return null;
  const booking = db.bookingRequests.find((b) => b.projectId === project.id);
  const session = booking?.sessionId
    ? db.sessions.find((s) => s.id === booking.sessionId)
    : db.sessions.find((s) => s.projectId === project.id);
  const contract = db.contracts.find((c) => c.projectId === project.id);
  const template = contract?.templateId
    ? db.contractTemplates.find((t) => t.id === contract.templateId)
    : db.contractTemplates[0];
  const policy =
    contract?.cancelPolicy ||
    template?.cancelPolicy ||
    ({ untilPayment: true, daysBeforeSession: 7 } as CancelPolicy);
  const startsAt = session?.startsAt || booking?.startsAt;
  const gate = canCancel({
    policy,
    paidAmount: project.paidAmount || 0,
    startsAt,
  });
  const canceled =
    project.stage === "canceled" || booking?.status === "canceled";
  return {
    studioId,
    db,
    project,
    booking,
    session,
    startsAt,
    gate,
    canceled,
  };
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  const ctxData = await loadCancelContext(token);
  if (!ctxData) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const { db, project, booking, startsAt, gate, canceled } = ctxData;
  return NextResponse.json({
    project: {
      name: project.name,
      stage: project.stage,
      type: project.type,
    },
    startsAt,
    status: booking?.status || project.stage,
    canCancel: gate.ok && !canceled,
    canRequestReschedule: !canceled,
    blockReason: gate.ok ? null : gate.reason,
    studioName: db.studio.name,
    studio: {
      name: db.studio.name,
      theme: db.studio.theme ?? null,
    },
  });
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  const limited = await rateLimitShared(
    `cancel:${token}:${clientIp(req)}`,
    5,
    60_000,
  );
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many attempts. Try again shortly." },
      {
        status: 429,
        headers: { "Retry-After": String(limited.retryAfterSec) },
      },
    );
  }

  const body = await req.json().catch(() => ({}));
  const action =
    body.action === "reschedule" ? ("reschedule" as const) : ("cancel" as const);
  const note = String(
    body.reason || body.note || "",
  ).trim();
  if (!note) {
    return NextResponse.json(
      { error: action === "reschedule" ? "Message required" : "Reason required" },
      { status: 400 },
    );
  }

  const ctxData = await loadCancelContext(token);
  if (!ctxData) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const {
    studioId,
    db,
    project,
    booking,
    session,
    startsAt,
    gate,
    canceled,
  } = ctxData;

  if (canceled) {
    return NextResponse.json(
      { error: "This booking is already canceled." },
      { status: 403 },
    );
  }

  const sessionTypeName =
    (booking &&
      db.sessionTypes.find((t) => t.id === booking.sessionTypeId)?.name) ||
    project.type ||
    "Session";

  if (action === "reschedule") {
    let preferredStartsAt: string | undefined;
    const rawPreferred = String(body.preferredStartsAt || "").trim();
    if (rawPreferred) {
      const ms = Date.parse(rawPreferred);
      if (Number.isNaN(ms)) {
        return NextResponse.json(
          { error: "Preferred time is invalid." },
          { status: 400 },
        );
      }
      if (ms < Date.now() - 60_000) {
        return NextResponse.json(
          { error: "Preferred time must be in the future." },
          { status: 400 },
        );
      }
      preferredStartsAt = new Date(ms).toISOString();
    }

    const requestedAt = new Date().toISOString();
    if (booking) {
      await patchStudioDoc(COL.bookingRequests, booking.id, {
        rescheduleRequestedAt: requestedAt,
        rescheduleNote: note,
        ...(preferredStartsAt
          ? { reschedulePreferredStartsAt: preferredStartsAt }
          : {}),
      });
    }

    const projectHref = `/admin/projects/${project.id}`;
    await emailStudioBookingRescheduleRequest({
      studioId,
      clientName: project.name,
      sessionTypeName,
      note,
      preferredStartsAt,
      currentStartsAt: startsAt,
      projectHref,
      projectId: project.id,
      requestedAt,
    });
    await notifyStudio({
      studioId,
      type: "booking_reschedule_requested",
      title: "Reschedule request",
      body: preferredStartsAt
        ? `${project.name}: ${new Date(preferredStartsAt).toLocaleString()}`
        : `${project.name}: ${note.slice(0, 80)}`,
      href: `${projectHref}#workflow`,
      emailStudio: false,
    });

    return NextResponse.json({ ok: true, action: "reschedule" });
  }

  if (!gate.ok) {
    return NextResponse.json({ error: gate.reason }, { status: 403 });
  }

  const googleEventId = session?.googleEventId;

  await patchStudioDoc(COL.projects, project.id, {
    stage: "canceled",
    workflowStep: "inquiry",
  });
  if (booking) {
    await patchStudioDoc(COL.bookingRequests, booking.id, {
      status: "canceled",
      cancelReason: note,
    });
  }
  if (session) {
    await patchStudioDoc(COL.projectSessions, session.id, {
      status: "archived",
      startsAt: null,
      endsAt: null,
      googleEventId: null,
    });
  }

  if (googleEventId) {
    await deleteGoogleCalendarEvent({ studioId, eventId: googleEventId });
  }
  await emailStudioBookingCanceled({
    studioId,
    clientName: project.name,
    sessionTypeName,
    reason: note,
    projectHref: `/admin/projects/${project.id}`,
    projectId: project.id,
  });
  await notifyStudio({
    studioId,
    type: "booking_canceled",
    title: "Request canceled",
    body: `${project.name}: ${note}`,
    href: `/admin/projects/${project.id}#workflow`,
    emailStudio: false,
  });

  return NextResponse.json({ ok: true, action: "cancel" });
}
