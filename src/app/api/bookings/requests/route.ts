import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { updateStudioDb } from "@/lib/db/store";
import {
  emailBookingConfirmed,
  notifyStudio,
} from "@/lib/notify/send";

/** Confirm or decline a booking request (updates request + linked project/session). */
export async function PATCH(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const id = String(body.id || "");
  const status = body.status as "confirmed" | "declined";
  if (!id || (status !== "confirmed" && status !== "declined")) {
    return NextResponse.json({ error: "id and status required" }, { status: 400 });
  }

  let projectId: string | undefined;
  let clientEmail: string | undefined;
  let clientName: string | undefined;
  let sessionTypeName = "Session";
  let startsAt: string | undefined;

  try {
    await updateStudioDb(admin.studioId, (db) => {
      const reqRow = db.bookingRequests.find((r) => r.id === id);
      if (!reqRow) throw new Error("Not found");
      const now = new Date().toISOString();
      reqRow.status = status;
      reqRow.updatedAt = now;
      projectId = reqRow.projectId;
      clientEmail = reqRow.email;
      clientName = reqRow.name;
      startsAt = reqRow.startsAt;
      sessionTypeName =
        db.sessionTypes.find((t) => t.id === reqRow.sessionTypeId)?.name ||
        "Session";

      if (reqRow.projectId) {
        const project = db.projects.find((p) => p.id === reqRow.projectId);
        if (project) {
          project.stage = status === "confirmed" ? "booked" : "inquiry";
          project.updatedAt = now;
        }
      }
      if (reqRow.sessionId) {
        const session = db.sessions.find((s) => s.id === reqRow.sessionId);
        if (session) {
          session.status = status === "confirmed" ? "booked" : "inquiry";
          session.updatedAt = now;
        }
      }
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (status === "confirmed" && clientEmail && startsAt) {
    await emailBookingConfirmed({
      studioId: admin.studioId,
      to: clientEmail,
      clientName: clientName || "there",
      sessionTypeName,
      startsAt,
    });
    await notifyStudio({
      studioId: admin.studioId,
      type: "booking_confirmed",
      title: "Booking confirmed",
      body: `${clientName || "Client"} · ${sessionTypeName}`,
      href: projectId ? `/admin/projects/${projectId}` : "/admin/bookings",
      emailStudio: false,
    });
  } else if (status === "declined") {
    await notifyStudio({
      studioId: admin.studioId,
      type: "booking_declined",
      title: "Booking declined",
      body: `${clientName || "Client"} · ${sessionTypeName}`,
      href: "/admin/bookings",
      emailStudio: false,
    });
  }

  return NextResponse.json({
    ok: true,
    projectId,
    projectHref: projectId ? `/admin/projects/${projectId}` : undefined,
  });
}
