import { NextResponse } from "next/server";
import {
  findStudioIdByProjectCancelToken,
  readStudioDb,
  updateStudioDb,
} from "@/lib/db/store";
import {
  emailStudioBookingCanceled,
  notifyStudio,
} from "@/lib/notify/send";
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

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  const studioId = await findStudioIdByProjectCancelToken(token);
  if (!studioId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const db = await readStudioDb(studioId);
  const project = db.projects.find((p) => p.cancelToken === token);
  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
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
  const gate = canCancel({
    policy,
    paidAmount: project.paidAmount || 0,
    startsAt: session?.startsAt || booking?.startsAt,
  });
  return NextResponse.json({
    project: {
      name: project.name,
      stage: project.stage,
      type: project.type,
    },
    startsAt: session?.startsAt || booking?.startsAt,
    status: booking?.status || project.stage,
    canCancel: gate.ok && project.stage !== "canceled" && booking?.status !== "canceled",
    blockReason: gate.ok ? null : gate.reason,
    studioName: db.studio.name,
  });
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const reason = String(body.reason || "").trim();
  if (!reason) {
    return NextResponse.json({ error: "Reason required" }, { status: 400 });
  }

  const studioId = await findStudioIdByProjectCancelToken(token);
  if (!studioId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const db = await readStudioDb(studioId);
  const project = db.projects.find((p) => p.cancelToken === token);
  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
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
  const gate = canCancel({
    policy,
    paidAmount: project.paidAmount || 0,
    startsAt: session?.startsAt || booking?.startsAt,
  });
  if (!gate.ok) {
    return NextResponse.json({ error: gate.reason }, { status: 403 });
  }
  if (project.stage === "canceled" || booking?.status === "canceled") {
    return NextResponse.json({ ok: true, already: true });
  }

  const sessionTypeName =
    (booking &&
      db.sessionTypes.find((t) => t.id === booking.sessionTypeId)?.name) ||
    project.type ||
    "Session";

  await updateStudioDb(studioId, (d) => {
    const now = new Date().toISOString();
    const p = d.projects.find((x) => x.id === project.id);
    if (p) {
      p.stage = "canceled";
      p.workflowStep = "inquiry";
      p.updatedAt = now;
    }
    const b = d.bookingRequests.find((x) => x.projectId === project.id);
    if (b) {
      b.status = "canceled";
      b.cancelReason = reason;
      b.updatedAt = now;
    }
    const s = session
      ? d.sessions.find((x) => x.id === session.id)
      : undefined;
    if (s) {
      s.status = "archived";
      s.updatedAt = now;
    }
  });

  await emailStudioBookingCanceled({
    studioId,
    clientName: project.name,
    sessionTypeName,
    reason,
    projectHref: `/admin/projects/${project.id}`,
  });
  await notifyStudio({
    studioId,
    type: "booking_canceled",
    title: "Request canceled",
    body: `${project.name}: ${reason}`,
    href: `/admin/projects/${project.id}`,
    emailStudio: false,
  });

  return NextResponse.json({ ok: true });
}
