import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { COL } from "@/lib/db/collections";
import { assertFirebaseReady } from "@/lib/db/require-firebase";
import { getStudioDoc, updateStudioDb } from "@/lib/db/store";
import { notifyStudio, emailClient } from "@/lib/notify/send";
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
  const { getBusyIntervals, overlapsBusy } = await import("@/lib/google-calendar");
  const busy = await getBusyIntervals({
    studioId: studio.id,
    timeMin: startsAt,
    timeMax: endPreview.toISOString(),
  });
  if (overlapsBusy(startsAt, endPreview.toISOString(), busy)) {
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
        type: st.name,
        stage: "inquiry",
        projectDate: startsAt.slice(0, 10),
        paidAmount: 0,
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

  const origin = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const projectHref = `/admin/projects/${createdProjectId}`;

  await notifyStudio({
    studioId: studio.id,
    type: "booking_submitted",
    title: "New inquiry from booking form",
    body: `${name} requested ${stPreview.name} · Open this Project to review the inquiry`,
    href: projectHref,
  });
  await emailClient({
    to: email,
    subject: `Booking received — ${studio.name}`,
    html: `<p>Thanks ${name}. We received your booking request and will confirm shortly.</p>`,
    text: `Thanks ${name}. We received your booking request and will confirm shortly.`,
    replyTo: studio.ownerEmail,
    fromDisplayName: studio.name,
    idempotencyKey: `booking-received/${createdProjectId}`,
  });

  return NextResponse.json({
    ok: true,
    booking,
    projectHref: `${origin}${projectHref}`,
  });
}
