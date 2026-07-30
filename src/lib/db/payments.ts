import { nanoid } from "nanoid";
import { COL } from "@/lib/db/collections";
import { assertFirebaseReady } from "@/lib/db/require-firebase";
import { getStudioDoc, updateStudioDb } from "@/lib/db/store";
import { workflowStepAfterDepositPaid } from "@/lib/workflow/state-rules";
import type { AuraDatabase, PaymentLinkTemplate } from "@/lib/types";

/** Find a payment link across studios (public pay page). */
export async function listStudiosWithPaymentLink(linkId: string) {
  const { db } = assertFirebaseReady();
  await getStudioDoc("noop").catch(() => null);
  const snap = await db.collection(COL.paymentLinks).doc(linkId).get();
  if (!snap.exists) return null;
  const link = { id: snap.id, ...snap.data() } as PaymentLinkTemplate;
  if (!link.studioId || link.archived || link.active === false) return null;
  const studio = await getStudioDoc(link.studioId);
  if (!studio) return null;
  return {
    studioId: link.studioId,
    studioName: studio.name,
    ownerEmail: studio.ownerEmail,
    stripeAccountId: studio.stripeAccountId,
    stripeOnboardingComplete: studio.stripeOnboardingComplete,
    link,
  };
}

/** Stable doc id for a Checkout Session charge. */
export function paymentTxIdFromCheckoutSession(sessionId: string): string {
  return sessionId.startsWith("cs_") ? `pay_${sessionId}` : `pay_cs_${sessionId}`;
}

function findExistingPaymentTx(
  db: AuraDatabase,
  opts: {
    stripeCheckoutSessionId?: string;
    stripePaymentIntentId?: string;
  },
) {
  const sessionId = opts.stripeCheckoutSessionId?.trim() || undefined;
  const pi = opts.stripePaymentIntentId?.trim() || undefined;

  return db.paymentTransactions.find((t) => {
    if (sessionId) {
      if (t.stripeCheckoutSessionId === sessionId) return true;
      if (t.id === paymentTxIdFromCheckoutSession(sessionId)) return true;
      // Legacy id shape from earlier webhooks
      if (t.id === `cs_${sessionId}` || t.id === sessionId) return true;
    }
    if (pi && t.stripePaymentIntentId && t.stripePaymentIntentId === pi) {
      return true;
    }
    return false;
  });
}

/**
 * Record a paid Checkout Session (AURA-010 / AURA-011).
 * Single writer for payment money + project side-effects (paidAmount, stage,
 * workflowStep, depositStatus, invoice paid). Webhook must not re-apply those.
 */
export async function recordPaymentLinkCharge(opts: {
  studioId: string;
  linkId: string;
  netAmount: number;
  processingFee: number;
  grossAmount: number;
  projectId?: string;
  stripePaymentIntentId?: string;
  stripeCheckoutSessionId?: string;
}): Promise<{ id: string; duplicate: boolean }> {
  const sessionId = opts.stripeCheckoutSessionId?.trim() || undefined;
  const pi = opts.stripePaymentIntentId?.trim() || undefined;

  if (!sessionId && !pi) {
    throw new Error(
      "recordPaymentLinkCharge requires stripeCheckoutSessionId or stripePaymentIntentId",
    );
  }

  const now = new Date().toISOString();
  const txId = sessionId
    ? paymentTxIdFromCheckoutSession(sessionId)
    : `pay_pi_${pi}`;

  let duplicate = false;
  let id = txId;

  await updateStudioDb(opts.studioId, (db) => {
    const existing = findExistingPaymentTx(db, {
      stripeCheckoutSessionId: sessionId,
      stripePaymentIntentId: pi,
    });
    if (existing) {
      duplicate = true;
      id = existing.id;
      return;
    }

    db.paymentTransactions.unshift({
      id: txId,
      studioId: opts.studioId,
      projectId: opts.projectId,
      paymentLinkId: opts.linkId,
      netAmount: opts.netAmount,
      processingFee: opts.processingFee,
      grossAmount: opts.grossAmount,
      stripePaymentIntentId: pi,
      stripeCheckoutSessionId: sessionId,
      status: "succeeded",
      refundedGross: 0,
      refundedNet: 0,
      reversalEventIds: [],
      createdAt: now,
    });

    db.analyticsEvents.push({
      id: nanoid(),
      studioId: opts.studioId,
      type: "payment_received",
      projectId: opts.projectId,
      meta: {
        netAmount: opts.netAmount,
        grossAmount: opts.grossAmount,
        paymentLinkId: opts.linkId,
        ...(sessionId ? { stripeCheckoutSessionId: sessionId } : {}),
        ...(pi ? { stripePaymentIntentId: pi } : {}),
      },
      at: now,
    });

    if (opts.projectId) {
      const project = db.projects.find((p) => p.id === opts.projectId);
      if (project) {
        project.paidAmount = (project.paidAmount || 0) + opts.netAmount;
        project.stage = "booked";
        project.workflowStep = workflowStepAfterDepositPaid(project.workflowStep);
        project.updatedAt = now;
      }
      for (const prop of db.proposals.filter(
        (x) => x.projectId === opts.projectId,
      )) {
        if (prop.depositStatus === "awaited" || prop.depositStatus === "none") {
          prop.depositStatus = "received";
        }
      }
      const inv =
        db.invoices.find(
          (i) => sessionId && i.stripeCheckoutSessionId === sessionId,
        ) ||
        db.invoices.find(
          (i) =>
            i.projectId === opts.projectId &&
            (i.status === "upcoming" || i.status === "past_due"),
        );
      if (inv) {
        inv.status = "paid";
        if (sessionId) inv.stripeCheckoutSessionId = sessionId;
        inv.updatedAt = now;
      }
    }
  });

  return { id, duplicate };
}

/** Locate a payment tx doc by Stripe ids (cross-studio). */
export async function findStudioPaymentTx(opts: {
  stripeCheckoutSessionId?: string;
  stripePaymentIntentId?: string;
}): Promise<{ studioId: string; txId: string } | null> {
  const { db } = assertFirebaseReady();
  const sessionId = opts.stripeCheckoutSessionId?.trim() || undefined;
  if (sessionId) {
    const docId = paymentTxIdFromCheckoutSession(sessionId);
    const snap = await db.collection(COL.paymentTransactions).doc(docId).get();
    if (snap.exists) {
      const data = snap.data() as { studioId?: string };
      if (data.studioId) return { studioId: data.studioId, txId: snap.id };
    }
  }
  const pi = opts.stripePaymentIntentId?.trim() || undefined;
  if (pi) {
    const q = await db
      .collection(COL.paymentTransactions)
      .where("stripePaymentIntentId", "==", pi)
      .limit(1)
      .get();
    const doc = q.docs[0];
    if (doc) {
      const data = doc.data() as { studioId?: string };
      if (data.studioId) return { studioId: data.studioId, txId: doc.id };
    }
  }
  return null;
}

function rollbackProjectAfterPaymentLoss(
  db: AuraDatabase,
  opts: {
    projectId?: string;
    sessionId?: string;
    netRemoved: number;
    now: string;
  },
) {
  if (!opts.projectId || opts.netRemoved <= 0) return;

  const project = db.projects.find((p) => p.id === opts.projectId);
  if (project) {
    project.paidAmount = Math.max(
      0,
      Math.round(((project.paidAmount || 0) - opts.netRemoved) * 100) / 100,
    );
    if (project.paidAmount <= 0.001) {
      project.paidAmount = 0;
      if (project.workflowStep === "prep") {
        project.workflowStep = "deposit";
      }
      if (project.stage === "booked") {
        project.stage = "inquiry";
      }
    }
    project.updatedAt = opts.now;
  }

  for (const prop of db.proposals.filter(
    (x) => x.projectId === opts.projectId,
  )) {
    if (prop.depositStatus === "received") {
      prop.depositStatus = "awaited";
    }
  }

  const inv =
    db.invoices.find(
      (i) => opts.sessionId && i.stripeCheckoutSessionId === opts.sessionId,
    ) ||
    db.invoices.find(
      (i) =>
        i.projectId === opts.projectId &&
        i.status === "paid" &&
        (!opts.sessionId || i.stripeCheckoutSessionId === opts.sessionId),
    );
  if (inv && inv.status === "paid") {
    inv.status = "past_due";
    inv.paidAt = undefined;
    inv.updatedAt = opts.now;
  }
}

/**
 * Apply refund / dispute / async-fail money rollback (AURA-016).
 * Idempotent on Stripe event id; refunds sync to cumulative `refundedGross`.
 */
export async function applyPaymentReversal(opts: {
  studioId: string;
  reason: "refund" | "dispute" | "async_failed";
  stripeEventId: string;
  stripeCheckoutSessionId?: string;
  stripePaymentIntentId?: string;
  /** Cumulative gross refunded on the charge (dollars). Required for refunds. */
  refundedGrossTotal?: number;
}): Promise<{
  applied: boolean;
  duplicate: boolean;
  missing: boolean;
  netRemoved: number;
  projectId?: string;
  status?: string;
}> {
  const sessionId = opts.stripeCheckoutSessionId?.trim() || undefined;
  const pi = opts.stripePaymentIntentId?.trim() || undefined;
  const now = new Date().toISOString();

  let applied = false;
  let duplicate = false;
  let missing = false;
  let netRemoved = 0;
  let projectId: string | undefined;
  let status: string | undefined;

  await updateStudioDb(opts.studioId, (db) => {
    const tx = findExistingPaymentTx(db, {
      stripeCheckoutSessionId: sessionId,
      stripePaymentIntentId: pi,
    });
    if (!tx) {
      missing = true;
      return;
    }

    projectId = tx.projectId;
    tx.reversalEventIds = tx.reversalEventIds || [];
    if (tx.reversalEventIds.includes(opts.stripeEventId)) {
      duplicate = true;
      status = tx.status;
      return;
    }

    const alreadyRefundedGross = tx.refundedGross || 0;
    const alreadyRefundedNet = tx.refundedNet || 0;
    const remainingNet = Math.max(
      0,
      Math.round((tx.netAmount - alreadyRefundedNet) * 100) / 100,
    );

    if (opts.reason === "refund") {
      const targetGross = Math.min(
        tx.grossAmount,
        Math.max(0, opts.refundedGrossTotal ?? 0),
      );
      if (targetGross <= alreadyRefundedGross + 0.001) {
        duplicate = true;
        tx.reversalEventIds.push(opts.stripeEventId);
        status = tx.status;
        return;
      }
      const fraction =
        tx.grossAmount > 0 ? targetGross / tx.grossAmount : 1;
      const targetNet =
        Math.round(tx.netAmount * Math.min(1, fraction) * 100) / 100;
      netRemoved =
        Math.round((targetNet - alreadyRefundedNet) * 100) / 100;
      if (netRemoved <= 0) {
        duplicate = true;
        tx.reversalEventIds.push(opts.stripeEventId);
        status = tx.status;
        return;
      }
      tx.refundedGross = targetGross;
      tx.refundedNet =
        Math.round((alreadyRefundedNet + netRemoved) * 100) / 100;
      tx.status =
        tx.refundedNet + 0.001 >= tx.netAmount
          ? "refunded"
          : "partially_refunded";
    } else {
      // dispute or async_failed — reverse remaining net
      if (remainingNet <= 0 && (tx.status === "disputed" || tx.status === "failed" || tx.status === "refunded")) {
        duplicate = true;
        tx.reversalEventIds.push(opts.stripeEventId);
        status = tx.status;
        return;
      }
      netRemoved = remainingNet;
      tx.refundedGross = tx.grossAmount;
      tx.refundedNet = tx.netAmount;
      tx.status = opts.reason === "dispute" ? "disputed" : "failed";
    }

    tx.reversalEventIds.push(opts.stripeEventId);
    status = tx.status;
    applied = true;

    if (netRemoved > 0) {
      rollbackProjectAfterPaymentLoss(db, {
        projectId: tx.projectId,
        sessionId: tx.stripeCheckoutSessionId || sessionId,
        netRemoved,
        now,
      });
      db.analyticsEvents.push({
        id: nanoid(),
        studioId: opts.studioId,
        type: "payment_reversed",
        projectId: tx.projectId,
        meta: {
          reason: opts.reason,
          netRemoved,
          stripeEventId: opts.stripeEventId,
          ...(tx.paymentLinkId ? { paymentLinkId: tx.paymentLinkId } : {}),
          ...(sessionId ? { stripeCheckoutSessionId: sessionId } : {}),
          ...(pi ? { stripePaymentIntentId: pi } : {}),
        },
        at: now,
      });
    }
  });

  return { applied, duplicate, missing, netRemoved, projectId, status };
}

/**
 * Restore paid state after a won dispute (AURA-016).
 * Re-applies remaining reversed net once; idempotent on event id.
 */
export async function restorePaymentAfterDisputeWon(opts: {
  studioId: string;
  stripeEventId: string;
  stripeCheckoutSessionId?: string;
  stripePaymentIntentId?: string;
}): Promise<{ restored: boolean; duplicate: boolean; missing: boolean }> {
  const sessionId = opts.stripeCheckoutSessionId?.trim() || undefined;
  const pi = opts.stripePaymentIntentId?.trim() || undefined;
  const now = new Date().toISOString();
  let restored = false;
  let duplicate = false;
  let missing = false;

  await updateStudioDb(opts.studioId, (db) => {
    const tx = findExistingPaymentTx(db, {
      stripeCheckoutSessionId: sessionId,
      stripePaymentIntentId: pi,
    });
    if (!tx) {
      missing = true;
      return;
    }
    tx.reversalEventIds = tx.reversalEventIds || [];
    if (tx.reversalEventIds.includes(opts.stripeEventId)) {
      duplicate = true;
      return;
    }
    if (tx.status !== "disputed") {
      tx.reversalEventIds.push(opts.stripeEventId);
      duplicate = true;
      return;
    }

    const netBack = tx.refundedNet || tx.netAmount;
    tx.reversalEventIds.push(opts.stripeEventId);
    tx.status = "succeeded";
    tx.refundedGross = 0;
    tx.refundedNet = 0;

    if (tx.projectId && netBack > 0) {
      const project = db.projects.find((p) => p.id === tx.projectId);
      if (project) {
        project.paidAmount =
          Math.round(((project.paidAmount || 0) + netBack) * 100) / 100;
        project.stage = "booked";
        project.workflowStep = workflowStepAfterDepositPaid(project.workflowStep);
        project.updatedAt = now;
      }
      for (const prop of db.proposals.filter(
        (x) => x.projectId === tx.projectId,
      )) {
        if (prop.depositStatus === "awaited" || prop.depositStatus === "none") {
          prop.depositStatus = "received";
        }
      }
      const inv =
        db.invoices.find(
          (i) =>
            tx.stripeCheckoutSessionId &&
            i.stripeCheckoutSessionId === tx.stripeCheckoutSessionId,
        ) ||
        db.invoices.find(
          (i) =>
            i.projectId === tx.projectId &&
            (i.status === "upcoming" || i.status === "past_due"),
        );
      if (inv) {
        inv.status = "paid";
        inv.updatedAt = now;
      }
    }
    restored = true;
  });

  return { restored, duplicate, missing };
}
