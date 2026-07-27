import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { readStudioDb } from "@/lib/db/store";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await readStudioDb(admin.studioId);
  const now = Date.now();
  const soon = now + 7 * 24 * 60 * 60 * 1000;
  const tz = db.studio.timeZone || "America/Denver";

  const awaitingProposals = db.proposals.filter((p) => p.status === "sent");
  const expiringGalleries = db.galleries.filter((g) => {
    if (g.status !== "live") return false;
    const t = new Date(g.expiresAt).getTime();
    return t <= soon;
  });
  const archiveFlags = db.galleries.filter((g) => {
    if (g.status === "archived") return false;
    return new Date(g.expiresAt).getTime() <= now || g.status === "expired";
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
          helperHref: `/admin/shoots/${upcoming.id}/helper`,
          projectHref: `/admin/projects/${upcoming.projectId}`,
        }
      : null,
    awaitingProposals,
    expiringGalleries,
    archiveFlags,
  });
}
