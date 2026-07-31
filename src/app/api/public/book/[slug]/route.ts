import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { recordEvent } from "@/lib/analytics";
import { COL } from "@/lib/db/collections";
import { findStudioByHomepageSlug } from "@/lib/db/homepage-slug";
import {
  appendStudioDoc,
  listSessionTypesForStudio,
} from "@/lib/db/store";
import {
  allocateProjectAdminSlug,
  allocateSessionAdminSlug,
} from "@/lib/admin-slug";
import { resolveBrowseMediaUrl } from "@/lib/media-url-server";
import { emailBookingReceived, notifyStudio } from "@/lib/notify/send";
import { clientIp, rateLimitShared } from "@/lib/rate-limit";
import type { BookingRequest, Project, ProjectSession } from "@/lib/types";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { slug } = await ctx.params;
  const studio = await findStudioByHomepageSlug(slug);
  if (!studio) return NextResponse.json({ error: "Not found" }, { status: 404 });
  // Session types only — no full studio graph (AURA-407).
  const sessionTypes = await listSessionTypesForStudio(studio.id);

  const url = new URL(req.url);
  if (url.searchParams.get("availability") === "1") {
    const sessionTypeId = String(url.searchParams.get("sessionTypeId") || "");
    const startsAt = String(url.searchParams.get("startsAt") || "");
    if (!sessionTypeId || !startsAt) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }
    const startMs = Date.parse(startsAt);
    if (!Number.isFinite(startMs)) {
      return NextResponse.json({ error: "Invalid time" }, { status: 400 });
    }
    if (startMs < Date.now() - 60_000) {
      return NextResponse.json({
        available: false,
        reason: "past",
      });
    }
    const st = sessionTypes.find((t) => t.id === sessionTypeId && t.active);
    if (!st) {
      return NextResponse.json({
        available: false,
        reason: "session_type",
      });
    }
    const end = new Date(startMs);
    end.setMinutes(end.getMinutes() + st.durationMinutes);
    const { getBusyIntervals, overlapsBusy, withBuffer } = await import(
      "@/lib/google-calendar"
    );
    const window = withBuffer(
      new Date(startMs).toISOString(),
      end.toISOString(),
      st.bufferMinutes || 0,
    );
    const busyResult = await getBusyIntervals({
      studioId: studio.id,
      timeMin: window.start,
      timeMax: window.end,
    });
    if (busyResult.syncFailed) {
      return NextResponse.json({
        available: false,
        reason: "sync_failed",
      });
    }
    if (overlapsBusy(window.start, window.end, busyResult.busy)) {
      return NextResponse.json({
        available: false,
        reason: "busy",
      });
    }
    return NextResponse.json({ available: true });
  }

  return NextResponse.json({
    studio: {
      name: studio.name,
      logoUrl: await resolveBrowseMediaUrl(studio.logoUrl),
      theme: studio.theme,
    },
    sessionTypes: sessionTypes
      .filter((t) => t.active)
      .map((t) => ({
        id: t.id,
        name: t.name,
        durationMinutes: t.durationMinutes,
        basePrice: t.basePrice,
        pricingMode: t.pricingMode ?? "after_intake",
        depositAmount: t.depositAmount,
        description: t.description,
      })),
  });
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { slug } = await ctx.params;
  const ip = clientIp(req);
  const ipLimit = await rateLimitShared(`book:${slug}:${ip}`, 5, 10 * 60_000);
  if (!ipLimit.ok) {
    return NextResponse.json(
      { error: "Too many attempts. Try again shortly." },
      {
        status: 429,
        headers: { "Retry-After": String(ipLimit.retryAfterSec) },
      },
    );
  }

  const studio = await findStudioByHomepageSlug(slug);
  if (!studio) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = await req.json();
  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const sessionTypeId = String(body.sessionTypeId || "");
  const startsAt = String(body.startsAt || "");
  if (!name || !email || !sessionTypeId || !startsAt) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const emailLimit = await rateLimitShared(
    `book-email:${email}`,
    2,
    60 * 60_000,
  );
  if (!emailLimit.ok) {
    return NextResponse.json(
      { error: "Too many attempts. Try again shortly." },
      {
        status: 429,
        headers: { "Retry-After": String(emailLimit.retryAfterSec) },
      },
    );
  }

  const now = new Date().toISOString();
  const sessionTypes = await listSessionTypesForStudio(studio.id);
  const stPreview = sessionTypes.find((t) => t.id === sessionTypeId);
  if (!stPreview || !stPreview.active) {
    return NextResponse.json(
      { error: "Session type not available" },
      { status: 400 },
    );
  }
  const endPreview = new Date(startsAt);
  endPreview.setMinutes(endPreview.getMinutes() + stPreview.durationMinutes);
  const { getBusyIntervals, overlapsBusy, withBuffer } = await import(
    "@/lib/google-calendar"
  );
  const window = withBuffer(
    startsAt,
    endPreview.toISOString(),
    stPreview.bufferMinutes || 0,
  );
  const busyResult = await getBusyIntervals({
    studioId: studio.id,
    timeMin: window.start,
    timeMax: window.end,
  });
  if (busyResult.syncFailed) {
    return NextResponse.json(
      {
        error: "Booking is temporarily unavailable. Please try again shortly.",
        calendarSyncFailed: true,
      },
      { status: 503 },
    );
  }
  if (overlapsBusy(window.start, window.end, busyResult.busy)) {
    return NextResponse.json(
      { error: "That time is unavailable. Please choose another slot." },
      { status: 409 },
    );
  }

  const { listProjectsForStudio, listSessionsForStudio } = await import(
    "@/lib/db/store"
  );
  const [existingProjects, existingSessions] = await Promise.all([
    listProjectsForStudio(studio.id),
    listSessionsForStudio(studio.id),
  ]);
  const project: Project = {
    id: nanoid(),
    studioId: studio.id,
    name,
    email,
    phone: body.phone ? String(body.phone) : undefined,
    notes: body.notes ? String(body.notes) : undefined,
    type: stPreview.name,
    stage: "inquiry",
    workflowStep: "inquiry",
    projectDate: startsAt.slice(0, 10),
    paidAmount: 0,
    cancelToken: nanoid(24),
    createdAt: now,
    updatedAt: now,
  };
  project.adminSlug = allocateProjectAdminSlug(
    { projects: existingProjects },
    name,
    project.id,
  );
  const createdProjectId = project.id;
  const end = new Date(startsAt);
  end.setMinutes(end.getMinutes() + stPreview.durationMinutes);
  const session: ProjectSession = {
    id: nanoid(),
    studioId: studio.id,
    projectId: project.id,
    type: stPreview.name,
    startsAt,
    endsAt: end.toISOString(),
    status: "inquiry",
    createdAt: now,
    updatedAt: now,
  };
  session.adminSlug = allocateSessionAdminSlug(
    { sessions: existingSessions },
    project.id,
    session.type,
    session.id,
  );
  const booking: BookingRequest = {
    id: nanoid(),
    studioId: studio.id,
    sessionTypeId,
    name,
    email,
    phone: body.phone ? String(body.phone) : undefined,
    startsAt,
    notes: body.notes ? String(body.notes) : undefined,
    status: "pending",
    projectId: project.id,
    sessionId: session.id,
    createdAt: now,
    updatedAt: now,
  };

  try {
    await appendStudioDoc(COL.projects, project);
    await appendStudioDoc(COL.projectSessions, session);
    await appendStudioDoc(COL.bookingRequests, booking);
  } catch {
    return NextResponse.json({ error: "Could not create booking" }, { status: 500 });
  }

  await recordEvent({
    type: "booking_submitted",
    studioId: studio.id,
    projectId: project.id,
    sessionId: session.id,
    meta: { sessionTypeId, bookingId: booking.id },
  });

  await notifyStudio({
    studioId: studio.id,
    type: "booking_submitted",
    title: "New booking request",
    body: `${name} · ${stPreview.name}`,
    href: "/admin/bookings",
  });
  await emailBookingReceived({
    studioId: studio.id,
    to: email,
    clientName: name,
    sessionTypeName: stPreview.name,
    projectId: createdProjectId,
  });

  return NextResponse.json({ ok: true });
}
