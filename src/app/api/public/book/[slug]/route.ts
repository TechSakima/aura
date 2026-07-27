import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { COL } from "@/lib/db/collections";
import { assertFirebaseReady } from "@/lib/db/require-firebase";
import { getStudioDoc, updateStudioDb } from "@/lib/db/store";
import { notifyStudio, emailClient, wrapHtml, absoluteUrl } from "@/lib/notify/send";
import { nextStepHtml, offeringLabel } from "@/lib/copy/offering";
import type { BookingRequest, Project, ProjectSession, Studio } from "@/lib/types";

async function findStudioBySlug(slug: string): Promise<Studio | null> {
  const { db } = assertFirebaseReady();
  await getStudioDoc("noop").catch(() => null);
  const snap = await db.collection(COL.studios).get();
  for (const doc of snap.docs) {
    const s = { id: doc.id, ...doc.data() } as Studio;
    if (s.homepage?.slug === slug) return s;
  }
  return null;
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { slug } = await ctx.params;
  const studio = await findStudioBySlug(slug);
  if (!studio) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { readStudioDb } = await import("@/lib/db/store");
  const db = await readStudioDb(studio.id);
  return NextResponse.json({
    studio: { name: studio.name, logoUrl: studio.logoUrl },
    sessionTypes: db.sessionTypes.filter((t) => t.active),
  });
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { slug } = await ctx.params;
  const studio = await findStudioBySlug(slug);
  if (!studio) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = await req.json();
  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const sessionTypeId = String(body.sessionTypeId || "");
  const startsAt = String(body.startsAt || "");
  if (!name || !email || !sessionTypeId || !startsAt) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const now = new Date().toISOString();
  let booking: BookingRequest | null = null;
  let createdProjectId = "";
  const { readStudioDb } = await import("@/lib/db/store");
  const studioDb = await readStudioDb(studio.id);
  const stPreview = studioDb.sessionTypes.find((t) => t.id === sessionTypeId);
  if (!stPreview) {
    return NextResponse.json({ error: "Session type not found" }, { status: 400 });
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
  const busy = await getBusyIntervals({
    studioId: studio.id,
    timeMin: window.start,
    timeMax: window.end,
  });
  if (overlapsBusy(window.start, window.end, busy)) {
    return NextResponse.json(
      { error: "That time is unavailable. Please choose another slot." },
      { status: 409 },
    );
  }

  try {
    await updateStudioDb(studio.id, (db) => {
      const st = db.sessionTypes.find((t) => t.id === sessionTypeId);
      if (!st) throw new Error("Session type not found");

      const project: Project = {
        id: nanoid(),
        studioId: studio.id,
        name,
        email,
        phone: body.phone ? String(body.phone) : undefined,
        notes: body.notes ? String(body.notes) : undefined,
        type: st.name,
        stage: "inquiry",
        workflowStep: "inquiry",
        projectDate: startsAt.slice(0, 10),
        paidAmount: 0,
        cancelToken: nanoid(24),
        createdAt: now,
        updatedAt: now,
      };
      createdProjectId = project.id;
      const end = new Date(startsAt);
      end.setMinutes(end.getMinutes() + st.durationMinutes);
      const session: ProjectSession = {
        id: nanoid(),
        studioId: studio.id,
        projectId: project.id,
        type: st.name,
        startsAt,
        endsAt: end.toISOString(),
        status: "inquiry",
        createdAt: now,
        updatedAt: now,
      };
      booking = {
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
      db.projects.unshift(project);
      db.sessions.unshift(session);
      db.bookingRequests.unshift(booking);
    });
  } catch {
    return NextResponse.json({ error: "Could not create booking" }, { status: 500 });
  }

  await notifyStudio({
    studioId: studio.id,
    type: "booking_submitted",
    title: "New booking request",
    body: `${name} · ${stPreview.name}`,
    href: "/admin/bookings",
  });
  await emailClient({
    to: email,
    subject: `Booking received — ${studio.name}`,
    fromDisplayName: studio.name,
    replyTo: studio.ownerEmail,
    html: wrapHtml({
      studioName: studio.name,
      title: "Request received",
      bodyHtml: `<p>Hi ${name},</p>
<p>Thanks — we received your booking request for ${offeringLabel(stPreview?.name)} and will confirm shortly.</p>
${nextStepHtml("No action needed yet. We'll email you when your booking is confirmed.")}`,
    }),
    text: `Hi ${name},\n\nThanks — we received your booking request for ${offeringLabel(stPreview?.name)} and will confirm shortly.\n\nNext: No action needed yet. We'll email you when your booking is confirmed.`,
    idempotencyKey: `booking-received/${createdProjectId}`,
  });

  return NextResponse.json({
    ok: true,
    booking,
    projectHref: absoluteUrl(`/admin/projects/${createdProjectId}`),
  });
}
