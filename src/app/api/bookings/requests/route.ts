import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { requireAdmin } from "@/lib/auth";
import { readStudioDb, updateStudioDb } from "@/lib/db/store";
import {
  deleteGoogleCalendarEvent,
  getBusyIntervals,
  overlapsBusy,
  pushSessionToGoogleCalendar,
  withBuffer,
} from "@/lib/google-calendar";
import {
  absoluteUrl,
  emailBookingConfirmed,
  emailBookingDeclined,
  emailQuestionnaireInvite,
  notifyStudio,
} from "@/lib/notify/send";
import { publicToken } from "@/lib/tokens";
import type { QuestionnaireResponse, ProjectWorkflowStep } from "@/lib/types";

/** Confirm or decline a booking request (updates request + linked project/session). */
export async function PATCH(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const id = String(body.id || "");
  const status = body.status as "confirmed" | "declined";
  const declineReason = String(body.declineReason || "").trim();
  const force = Boolean(body.force);
  if (!id || (status !== "confirmed" && status !== "declined")) {
    return NextResponse.json({ error: "id and status required" }, { status: 400 });
  }
  if (status === "declined" && !declineReason) {
    return NextResponse.json(
      { error: "Decline reason required" },
      { status: 400 },
    );
  }

  const db0 = await readStudioDb(admin.studioId);
  const req0 = db0.bookingRequests.find((r) => r.id === id);
  if (!req0) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const st0 = db0.sessionTypes.find((t) => t.id === req0.sessionTypeId);
  const session0 = req0.sessionId
    ? db0.sessions.find((s) => s.id === req0.sessionId)
    : null;

  let conflicts: { start: string; end: string }[] = [];
  if (status === "confirmed" && session0?.startsAt && session0?.endsAt) {
    const window = withBuffer(
      session0.startsAt,
      session0.endsAt,
      st0?.bufferMinutes || 0,
    );
    const busyResult = await getBusyIntervals({
      studioId: admin.studioId,
      timeMin: window.start,
      timeMax: window.end,
    });
    if (busyResult.syncFailed) {
      return NextResponse.json(
        {
          error:
            busyResult.syncError ||
            "Google Calendar sync failed. Reconnect Calendar, then try again.",
          calendarSyncFailed: true,
        },
        { status: 503 },
      );
    }
    // Ignore this session's own block
    conflicts = busyResult.busy.filter(
      (b) =>
        !(
          b.start === session0.startsAt &&
          b.end === session0.endsAt
        ) && overlapsBusy(window.start, window.end, [b]),
    );
    if (conflicts.length && !force) {
      return NextResponse.json(
        {
          error: "Requested time conflicts with another session",
          conflicts,
          needsForce: true,
        },
        { status: 409 },
      );
    }
  }

  let projectId: string | undefined;
  let clientEmail: string | undefined;
  let clientName: string | undefined;
  let sessionTypeName = "Session";
  let startsAt: string | undefined;
  let cancelToken: string | undefined;
  let questionnaireTemplateId: string | undefined;
  let pricingMode = st0?.pricingMode || "after_intake";
  let nextStep: ProjectWorkflowStep = "questionnaire";
  let googleEventIdToDelete: string | undefined;

  try {
    await updateStudioDb(admin.studioId, (db) => {
      const reqRow = db.bookingRequests.find((r) => r.id === id);
      if (!reqRow) throw new Error("Not found");
      const now = new Date().toISOString();
      reqRow.status = status;
      reqRow.updatedAt = now;
      if (status === "declined") reqRow.declineReason = declineReason;
      projectId = reqRow.projectId;
      clientEmail = reqRow.email;
      clientName = reqRow.name;
      startsAt = reqRow.startsAt;
      const st = db.sessionTypes.find((t) => t.id === reqRow.sessionTypeId);
      sessionTypeName = st?.name || "Session";
      questionnaireTemplateId = st?.questionnaireTemplateId;
      pricingMode = st?.pricingMode || "after_intake";

      if (reqRow.projectId) {
        const project = db.projects.find((p) => p.id === reqRow.projectId);
        if (project) {
          if (status === "confirmed") {
            nextStep = questionnaireTemplateId
              ? "questionnaire"
              : pricingMode === "upfront"
                ? "contract"
                : "questionnaire";
            project.stage = "booked";
            project.workflowStep = nextStep;
            if (!project.cancelToken) project.cancelToken = nanoid(24);
            cancelToken = project.cancelToken;
          } else {
            project.stage = "canceled";
            project.workflowStep = "inquiry";
          }
          project.updatedAt = now;
        }
      }
      if (reqRow.sessionId) {
        const session = db.sessions.find((s) => s.id === reqRow.sessionId);
        if (session) {
          if (status === "confirmed") {
            session.status = "booked";
          } else {
            googleEventIdToDelete = session.googleEventId;
            session.googleEventId = undefined;
            session.status = "archived";
            session.startsAt = undefined;
            session.endsAt = undefined;
          }
          session.updatedAt = now;
        }
      }
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let calendarPushFailed = false;
  let calendarPushError: string | undefined;

  if (status === "confirmed" && clientEmail && startsAt) {
    const cancelHref = cancelToken
      ? absoluteUrl(`/cancel/${cancelToken}`)
      : undefined;
    await emailBookingConfirmed({
      studioId: admin.studioId,
      to: clientEmail,
      clientName: clientName || "there",
      sessionTypeName,
      startsAt,
      cancelHref,
      nextWorkflowStep: nextStep,
    });
    await notifyStudio({
      studioId: admin.studioId,
      type: "booking_confirmed",
      title: "Booking accepted",
      body: `${clientName || "Guest"} · ${sessionTypeName}`,
      href: projectId ? `/admin/projects/${projectId}` : "/admin/bookings",
      emailStudio: false,
    });

    // Auto-send questionnaire when Session Type has a template
    if (projectId && questionnaireTemplateId) {
      const db = await readStudioDb(admin.studioId);
      const project = db.projects.find((p) => p.id === projectId);
      const template = db.questionnaireTemplates.find(
        (t) => t.id === questionnaireTemplateId,
      );
      if (project && template) {
        const now = new Date().toISOString();
        const response: QuestionnaireResponse = {
          id: nanoid(),
          studioId: admin.studioId,
          projectId,
          templateId: template.id,
          token: publicToken(20),
          title: template.name,
          questions: template.questions,
          answers: {},
          createdAt: now,
          updatedAt: now,
        };
        await updateStudioDb(admin.studioId, (d) => {
          d.questionnaireResponses.unshift(response);
        });
        await emailQuestionnaireInvite({
          studioId: admin.studioId,
          to: project.email,
          clientName: project.name,
          title: template.name,
          token: response.token,
        });
      }
    }

    // GCal push (same connection as conflict check; surface failure)
    if (session0?.startsAt && session0?.endsAt) {
      const pushed = await pushSessionToGoogleCalendar({
        studioId: admin.studioId,
        title: `${clientName || "Session"} · ${sessionTypeName}`,
        startsAt: session0.startsAt,
        endsAt: session0.endsAt,
      });
      if (pushed.eventId && req0.sessionId) {
        await updateStudioDb(admin.studioId, (d) => {
          const s = d.sessions.find((x) => x.id === req0.sessionId);
          if (s) s.googleEventId = pushed.eventId!;
        });
      }
      if (pushed.failed) {
        calendarPushFailed = true;
        calendarPushError = pushed.error;
      }
    }
  } else if (status === "declined") {
    if (googleEventIdToDelete) {
      await deleteGoogleCalendarEvent({
        studioId: admin.studioId,
        eventId: googleEventIdToDelete,
      });
    }
    if (clientEmail) {
      await emailBookingDeclined({
        studioId: admin.studioId,
        to: clientEmail,
        clientName: clientName || "there",
        sessionTypeName,
        reason: declineReason,
        requestId: id,
      });
      await notifyStudio({
        studioId: admin.studioId,
        type: "booking_declined",
        title: "Booking declined",
        body: `${clientName || "Guest"} · ${sessionTypeName}`,
        href: "/admin/bookings",
        emailStudio: false,
      });
    }
  }

  return NextResponse.json({
    ok: true,
    projectId,
    projectHref: projectId ? `/admin/projects/${projectId}` : undefined,
    workflowStep: status === "confirmed" ? nextStep : undefined,
    conflicts: conflicts.length ? conflicts : undefined,
    calendarPushFailed: calendarPushFailed || undefined,
    calendarPushError: calendarPushError || undefined,
  });
}
