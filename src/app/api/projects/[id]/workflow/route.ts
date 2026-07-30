import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { readStudioDb } from "@/lib/db/store";
import {
  isBalanceInvoiceTitle,
  isDepositInvoiceTitle,
  projectQuotedTotal,
  projectRemainingBalance,
} from "@/lib/payments/project-balance";
import type { ProjectWorkflowStep } from "@/lib/types";

/** Server-computed workflow readiness (AURA-172). UI consumes; does not re-derive. */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const db = await readStudioDb(admin.studioId);
  const project = db.projects.find((p) => p.id === id);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const questionnaires = db.questionnaireResponses.filter((r) => r.projectId === id);
  const contracts = db.contracts.filter((c) => c.projectId === id);
  const invoices = db.invoices.filter((i) => i.projectId === id);
  const proposals = db.proposals.filter((p) => p.projectId === id);
  const sessions = db.sessions.filter((s) => s.projectId === id);

  const qDone = questionnaires.some((r) => Boolean(r.submittedAt));
  const qSent = questionnaires.length > 0;
  const contractSigned = contracts.some((c) => c.status === "completed");
  const contractSent = contracts.length > 0;
  const quoteAccepted = proposals.some((p) => p.status === "accepted");
  const quoteExists = proposals.length > 0;
  const depositReceived = proposals.some((p) => p.depositStatus === "received");
  const depositPaid =
    invoices.some((i) => i.status === "paid" && isDepositInvoiceTitle(i.title)) ||
    depositReceived ||
    invoices.some((i) => i.status === "paid" && !isBalanceInvoiceTitle(i.title));

  const quotedTotal = projectQuotedTotal(proposals, id);
  const remainingBalance = projectRemainingBalance({
    quotedTotal,
    paidAmount: project.paidAmount,
  });
  const balancePaid =
    remainingBalance === 0 ||
    invoices.some((i) => i.status === "paid" && isBalanceInvoiceTitle(i.title));

  const primarySession = sessions[0];
  const gallery = primarySession?.galleryId
    ? db.galleries.find((g) => g.id === primarySession.galleryId)
    : db.galleries.find(
        (g) => (g.sessionId || g.shootId) === primarySession?.id,
      );
  const photoCount = gallery
    ? db.photos.filter((p) => p.galleryId === gallery.id).length
    : 0;

  const prepReady = Boolean(
    primarySession?.wizardSkippedPrep ||
      db.shootPlans.some((p) => p.sessionId === primarySession?.id),
  );
  const deliveryReady = Boolean(
    gallery?.status === "live" ||
      gallery?.status === "archived" ||
      photoCount > 0 ||
      primarySession?.status === "delivered" ||
      primarySession?.status === "archived",
  );

  const sessionUnlocked = depositPaid;
  const current = project.workflowStep || "inquiry";

  const statusByStep: Record<ProjectWorkflowStep, "done" | "active" | "todo"> = {
    inquiry: "done",
    questionnaire: qDone ? "done" : qSent ? "active" : "todo",
    pricing: quoteAccepted ? "done" : quoteExists ? "active" : "todo",
    contract: contractSigned ? "done" : contractSent ? "active" : "todo",
    deposit: depositPaid ? "done" : "todo",
    prep: !sessionUnlocked ? "todo" : prepReady ? "done" : current === "prep" ? "active" : "todo",
    delivery: !sessionUnlocked
      ? "todo"
      : deliveryReady
        ? "done"
        : current === "delivery"
          ? "active"
          : "todo",
  };

  return NextResponse.json({
    projectId: id,
    workflowStep: project.workflowStep,
    statusByStep,
    sessionUnlocked,
    depositPaid,
    balancePaid,
    remainingBalance,
    quotedTotal,
  });
}
