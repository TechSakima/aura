import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import {
  projectWorkflowHref,
  sessionDeliveryHref,
  sessionShootDayHref,
} from "@/lib/admin-deep-links";
import { listRecentContactMessages, readStudioDb } from "@/lib/db/store";
import {
  countDeadContactOutbox,
  drainEmailOutbox,
} from "@/lib/email-outbox";
import { buildFirstProjectGuide } from "@/lib/first-project-guide";
import { contactSourceLabel } from "@/lib/public-contact-server";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Opportunistic contact email retry (AURA-313) — do not block dashboard.
  void drainEmailOutbox({ limit: 5 }).catch((err) => {
    console.error("[dashboard] outbox drain", err);
  });

  // Hot path: skip photos + analytics (AURA-407).
  const db = await readStudioDb(admin.studioId, {
    photos: false,
    analytics: false,
  });
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
        ? projectWorkflowHref(p.projectId)
        : "/admin/projects",
    }));

  function galleryAdminHref(g: (typeof db.galleries)[number]) {
    const sessionId = g.sessionId || g.shootId;
    const session = sessionId
      ? db.sessions.find((s) => s.id === sessionId)
      : null;
    const project = session
      ? db.projects.find((p) => p.id === session.projectId)
      : g.projectId
        ? db.projects.find((p) => p.id === g.projectId)
        : null;
    if (project && session) {
      return sessionDeliveryHref(project.id, session.id);
    }
    if (project) return projectWorkflowHref(project.id);
    return "/admin/projects";
  }

  const expiringGalleries = db.galleries
    .filter((g) => {
      if (g.status !== "live") return false;
      const t = new Date(g.expiresAt).getTime();
      return t <= soon;
    })
    .map((g) => ({
      id: g.id,
      title: g.title,
      expiresAt: g.expiresAt,
      publicToken: g.publicToken,
      adminHref: galleryAdminHref(g),
    }));
  const archiveFlags = db.galleries.filter((g) => {
    if (g.status === "archived") return false;
    return new Date(g.expiresAt).getTime() <= now || g.status === "expired";
  });
  const archiveFlagRows = archiveFlags.map((g) => ({
    id: g.id,
    title: g.title,
    expiresAt: g.expiresAt,
    adminHref: galleryAdminHref(g),
  }));

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

  const firstProjectGuide = buildFirstProjectGuide({
    projects: db.projects,
    proposals: db.proposals,
    contracts: db.contracts,
    invoices: db.invoices,
    stripeOnboardingComplete: Boolean(db.studio.stripeOnboardingComplete),
  });

  const deadEmailCount = await countDeadContactOutbox(admin.studioId);
  const deliveryIssues: {
    kind: "email" | "calendar" | "payments";
    title: string;
    body: string;
    href: string;
  }[] = [];
  if (db.studio.stripeConnectLastError) {
    deliveryIssues.push({
      kind: "payments",
      title: "Payments",
      body: db.studio.stripeConnectLastError,
      href: "/admin/settings/payments",
    });
  }
  if (db.studio.googleCalendarLastSyncError) {
    const raw = db.studio.googleCalendarLastSyncError;
    const body = /oauth is not configured/i.test(raw)
      ? "Calendar sync unavailable"
      : /token refresh/i.test(raw)
        ? "Couldn’t refresh calendar connection"
        : /freeBusy/i.test(raw)
          ? "Couldn’t read calendar availability"
          : raw;
    deliveryIssues.push({
      kind: "calendar",
      title: "Calendar",
      body,
      href: "/admin/settings/integrations",
    });
  }
  if (deadEmailCount > 0) {
    deliveryIssues.push({
      kind: "email",
      title: "Message email",
      body:
        deadEmailCount === 1
          ? "1 contact email couldn’t be delivered"
          : `${deadEmailCount} contact emails couldn’t be delivered`,
      href: "/admin#messages",
    });
  }

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
    deliveryIssues,
    firstProjectGuide: firstProjectGuide.complete
      ? null
      : firstProjectGuide,
    upcomingSession: upcoming
      ? {
          id: upcoming.id,
          projectId: upcoming.projectId,
          projectName: upcomingProject?.name || "Project",
          type: upcoming.type,
          startsAt: upcoming.startsAt,
          helperHref: sessionShootDayHref(upcoming.projectId, upcoming.id),
          projectHref: projectWorkflowHref(upcoming.projectId),
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
      projectId: m.projectId,
      projectHref: m.projectId
        ? `/admin/projects/${m.projectId}#messages`
        : undefined,
    })),
  });
}
