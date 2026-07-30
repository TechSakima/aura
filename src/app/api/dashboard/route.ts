import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { listRecentContactMessages, readStudioDb } from "@/lib/db/store";
import { drainEmailOutbox } from "@/lib/email-outbox";
import { contactSourceLabel } from "@/lib/public-contact-server";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Opportunistic contact email retry (AURA-313) — do not block dashboard.
  void drainEmailOutbox({ limit: 5 }).catch((err) => {
    console.error("[dashboard] outbox drain", err);
  });

  const db = await readStudioDb(admin.studioId);
  const recentContacts = await listRecentContactMessages(admin.studioId, 8);
  const now = Date.now();
  const soon = now + 7 * 24 * 60 * 60 * 1000;
  const tz = db.studio.timeZone || "America/Denver";

  const awaitingProposals = db.proposals
    .filter((p) => p.status === "sent")
    .map((p) => ({
      id: p.id,
      title: p.title,
      token: p.token,
      projectHref: p.projectId
        ? `/admin/projects/${p.projectId}#workflow`
        : "/admin/projects",
    }));
  const expiringGalleries = db.galleries.filter((g) => {
    if (g.status !== "live") return false;
    const t = new Date(g.expiresAt).getTime();
    return t <= soon;
  });
  const archiveFlags = db.galleries.filter((g) => {
    if (g.status === "archived") return false;
    return new Date(g.expiresAt).getTime() <= now || g.status === "expired";
  });
  const archiveFlagRows = archiveFlags.map((g) => {
    const sessionId = g.sessionId || g.shootId;
    const session = sessionId
      ? db.sessions.find((s) => s.id === sessionId)
      : null;
    const project = session
      ? db.projects.find((p) => p.id === session.projectId)
      : g.projectId
        ? db.projects.find((p) => p.id === g.projectId)
        : null;
    return {
      id: g.id,
      title: g.title,
      expiresAt: g.expiresAt,
      adminHref: project
        ? `/admin/projects/${project.id}${session ? `/sessions/${session.id}?step=delivery` : ""}`
        : `/admin/projects`,
    };
  });

  const upcoming = [...db.sessions]
    .filter((s) => s.startsAt && new Date(s.startsAt).getTime() >= now - 60_000)
    .filter((s) => !["archived", "delivered"].includes(s.status))
    .sort(
      (a, b) =>
        new Date(a.startsAt!).getTime() - new Date(b.startsAt!).getTime(),
    )[0];

  const upcomingProject = upcoming
    ? db.projects.find((p) => p.id === upcoming.projectId)
    : null;

  return NextResponse.json({
    studio: {
      name: db.studio.name,
      brandTagline: db.studio.brandTagline,
      timeZone: tz,
    },
    counts: {
      projects: db.projects.length,
      sessions: db.sessions.length,
      quotes: db.proposals.length,
      galleries: db.galleries.length,
    },
    upcomingSession: upcoming
      ? {
          id: upcoming.id,
          projectId: upcoming.projectId,
          projectName: upcomingProject?.name || "Project",
          type: upcoming.type,
          startsAt: upcoming.startsAt,
          helperHref: `/admin/projects/${upcoming.projectId}/sessions/${upcoming.id}?step=shoot-day`,
          projectHref: `/admin/projects/${upcoming.projectId}`,
        }
      : null,
    awaitingProposals,
    expiringGalleries,
    archiveFlags: archiveFlagRows,
    recentContacts: recentContacts.map((m) => ({
      id: m.id,
      name: m.name,
      email: m.email,
      source: contactSourceLabel(m.source),
      context: m.context,
      preview:
        m.message.length > 100
          ? `${m.message.slice(0, 97)}…`
          : m.message,
      createdAt: m.createdAt,
    })),
  });
}
