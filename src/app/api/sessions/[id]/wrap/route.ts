import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getShootBundle, readStudioDb, updateStudioDb } from "@/lib/db/store";
import {
  isBalanceInvoiceTitle,
  isDepositInvoiceTitle,
  projectQuotedTotal,
  projectRemainingBalance,
} from "@/lib/payments/project-balance";

function wrapSummary(opts: {
  studioId: string;
  sessionId: string;
  db: Awaited<ReturnType<typeof readStudioDb>>;
}) {
  const session = opts.db.sessions.find((s) => s.id === opts.sessionId);
  if (!session || session.studioId !== opts.studioId) return null;

  const project = opts.db.projects.find((p) => p.id === session.projectId);
  const gallery =
    opts.db.galleries.find(
      (g) =>
        (g.sessionId || g.shootId) === session.id ||
        g.id === session.galleryId,
    ) || null;

  const openInvoices = opts.db.invoices.filter(
    (i) =>
      i.projectId === session.projectId &&
      i.status !== "paid" &&
      i.status !== "canceled",
  );
  const quotedTotal = project
    ? projectQuotedTotal(opts.db.proposals, project.id)
    : null;
  const remaining = project
    ? projectRemainingBalance({
        quotedTotal,
        paidAmount: project.paidAmount,
      })
    : null;

  return {
    session: {
      id: session.id,
      status: session.status,
      projectId: session.projectId,
      type: session.type,
    },
    project: project
      ? {
          id: project.id,
          stage: project.stage,
          name: project.name,
          paidAmount: project.paidAmount || 0,
        }
      : null,
    gallery: gallery
      ? {
          id: gallery.id,
          status: gallery.status,
          showOnHomepage: Boolean(gallery.showOnHomepage),
        }
      : null,
    homepageEnabled: Boolean(opts.db.studio.homepage?.enabled),
    openInvoiceCount: openInvoices.length,
    openInvoices: openInvoices.map((i) => ({
      id: i.id,
      title: i.title,
      netAmount: i.netAmount,
      status: i.status,
      kind: isBalanceInvoiceTitle(i.title)
        ? ("balance" as const)
        : isDepositInvoiceTitle(i.title)
          ? ("deposit" as const)
          : ("other" as const),
    })),
    remainingBalance: remaining,
    completed:
      session.status === "delivered" ||
      session.status === "archived" ||
      project?.stage === "delivered" ||
      project?.stage === "completed",
  };
}

/** Wrap status + reminders (open invoices, homepage). */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const bundle = await getShootBundle(id);
  if (!bundle || bundle.shoot.studioId !== admin.studioId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const db = await readStudioDb(admin.studioId);
  const summary = wrapSummary({
    studioId: admin.studioId,
    sessionId: id,
    db,
  });
  if (!summary) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(summary);
}

/**
 * Mark session delivered and project delivered (or completed if nothing unpaid).
 * Does not archive the gallery.
 */
export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const bundle = await getShootBundle(id);
  if (!bundle || bundle.shoot.studioId !== admin.studioId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const now = new Date().toISOString();
  let projectStage: "delivered" | "completed" = "delivered";

  await updateStudioDb(admin.studioId, (db) => {
    const session = db.sessions.find((s) => s.id === id);
    if (!session) return;
    const project = db.projects.find((p) => p.id === session.projectId);
    const openInvoices = db.invoices.filter(
      (i) =>
        i.projectId === session.projectId &&
        i.status !== "paid" &&
        i.status !== "canceled",
    );
    const quotedTotal = project
      ? projectQuotedTotal(db.proposals, project.id)
      : null;
    const remaining = project
      ? projectRemainingBalance({
          quotedTotal,
          paidAmount: project.paidAmount,
        })
      : null;
    const balanceClear =
      openInvoices.length === 0 && (remaining == null || remaining <= 0);

    if (session.status !== "archived") {
      session.status = "delivered";
    }
    session.updatedAt = now;

    if (project && project.stage !== "archived" && project.stage !== "canceled") {
      projectStage = balanceClear ? "completed" : "delivered";
      project.stage = projectStage;
      if (project.workflowStep !== "delivery") {
        project.workflowStep = "delivery";
      }
      project.updatedAt = now;
    }
  });

  const db = await readStudioDb(admin.studioId);
  const summary = wrapSummary({
    studioId: admin.studioId,
    sessionId: id,
    db,
  });
  return NextResponse.json({
    ok: true,
    projectStage,
    ...summary,
  });
}
