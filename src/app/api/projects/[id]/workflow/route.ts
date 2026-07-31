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
import {
  aggregateSessionStepState,
  isSessionDeliveryReady,
  isSessionPrepReady,
} from "@/lib/workflow/session-readiness";

/** Server-computed workflow readiness (AURA-172 / AURA-129). */
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
  const contractSent = contracts.some(
    (c) => c.status === "awaiting_signature" || c.status === "completed",
  );
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

  const openSessions = sessions.filter((s) => s.status !== "archived");
  const prepReadyCount = openSessions.filter((s) =>
    isSessionPrepReady({
      status: s.status,
      wizardSkippedPrep: s.wizardSkippedPrep,
      prepComplete:
        Boolean(s.wizardSkippedPrep) ||
        db.shootPlans.some(
          (p) => (p.sessionId || p.shootId) === s.id,
        ),
    }),
  ).length;
  const deliveryReadyCount = openSessions.filter((s) => {
    const gallery = s.galleryId
      ? db.galleries.find((g) => g.id === s.galleryId)
      : db.galleries.find((g) => (g.sessionId || g.shootId) === s.id);
    return isSessionDeliveryReady({
      status: s.status,
      galleryStatus: gallery?.status,
      deliveryComplete:
        gallery?.status === "live" ||
        gallery?.status === "archived" ||
        s.status === "delivered",
    });
  }).length;

  const sessionUnlocked = depositPaid;
  const current = project.workflowStep || "inquiry";
  const prepAgg = aggregateSessionStepState({
    unlocked: sessionUnlocked,
    currentIsStep: current === "prep",
    readyCount: prepReadyCount,
    total: openSessions.length,
  });
  const deliveryAgg = aggregateSessionStepState({
    unlocked: sessionUnlocked,
    currentIsStep: current === "delivery",
    readyCount: deliveryReadyCount,
    total: openSessions.length,
  });

  const statusByStep: Record<ProjectWorkflowStep, "done" | "active" | "todo"> = {
    inquiry: "done",
    questionnaire: qDone ? "done" : qSent ? "active" : "todo",
    pricing: quoteAccepted ? "done" : quoteExists ? "active" : "todo",
    contract: contractSigned ? "done" : contractSent ? "active" : "todo",
    deposit: depositPaid ? "done" : "todo",
    prep: prepAgg.state,
    delivery: deliveryAgg.state,
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
    sessionCounts: {
      open: openSessions.length,
      prepReady: prepReadyCount,
      deliveryReady: deliveryReadyCount,
    },
  });
}
