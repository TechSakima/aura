import { nanoid } from "nanoid";
import { COL } from "@/lib/db/collections";
import { assertFirebaseReady } from "@/lib/db/require-firebase";
import { getStudioDoc, updateStudioDb } from "@/lib/db/store";
import type { PaymentLinkTemplate } from "@/lib/types";

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

export async function recordPaymentLinkCharge(opts: {
  studioId: string;
  linkId: string;
  netAmount: number;
  processingFee: number;
  grossAmount: number;
  projectId?: string;
  stripePaymentIntentId?: string;
  stripeCheckoutSessionId?: string;
}) {
  const now = new Date().toISOString();
  const id = nanoid();
  await updateStudioDb(opts.studioId, (db) => {
    const already = opts.stripeCheckoutSessionId
      ? db.paymentTransactions.some(
          (t) =>
            t.stripePaymentIntentId === opts.stripePaymentIntentId ||
            (opts.stripeCheckoutSessionId &&
              t.id === `cs_${opts.stripeCheckoutSessionId}`),
        )
      : false;
    if (already) return;

    db.paymentTransactions.unshift({
      id: opts.stripeCheckoutSessionId
        ? `cs_${opts.stripeCheckoutSessionId}`
        : id,
      studioId: opts.studioId,
      projectId: opts.projectId,
      paymentLinkId: opts.linkId,
      netAmount: opts.netAmount,
      processingFee: opts.processingFee,
      grossAmount: opts.grossAmount,
      stripePaymentIntentId: opts.stripePaymentIntentId,
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
      },
      at: now,
    });

    if (opts.projectId) {
      const project = db.projects.find((p) => p.id === opts.projectId);
      if (project) {
        project.paidAmount = (project.paidAmount || 0) + opts.netAmount;
        project.stage = "booked";
        project.workflowStep = "prep";
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
          (i) =>
            opts.stripeCheckoutSessionId &&
            i.stripeCheckoutSessionId === opts.stripeCheckoutSessionId,
        ) ||
        db.invoices.find(
          (i) =>
            i.projectId === opts.projectId &&
            (i.status === "upcoming" || i.status === "past_due"),
        );
      if (inv) {
        inv.status = "paid";
        inv.updatedAt = now;
      }
    }
  });
  return { id };
}
