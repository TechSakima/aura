import { nanoid } from "nanoid";
import { COL } from "@/lib/db/collections";
import { assertFirebaseReady } from "@/lib/db/require-firebase";
import { getStudioDoc, updateStudioDb } from "@/lib/db/store";
import type { PaymentLinkTemplate } from "@/lib/types";

/** Find a payment link across studios (public pay page). */
export async function listStudiosWithPaymentLink(linkId: string) {
  const { db } = assertFirebaseReady();
  // Touch migration via any store entrypoint
  await getStudioDoc("noop").catch(() => null);
  const snap = await db.collection(COL.paymentLinks).doc(linkId).get();
  if (!snap.exists) return null;
  const link = { id: snap.id, ...snap.data() } as PaymentLinkTemplate;
  if (!link.studioId) return null;
  const studio = await getStudioDoc(link.studioId);
  if (!studio) return null;
  return {
    studioId: link.studioId,
    ownerEmail: studio.ownerEmail,
    link,
  };
}

export async function recordPaymentLinkCharge(opts: {
  studioId: string;
  linkId: string;
  netAmount: number;
  processingFee: number;
  grossAmount: number;
}) {
  const now = new Date().toISOString();
  await updateStudioDb(opts.studioId, (db) => {
    db.paymentTransactions.unshift({
      id: nanoid(),
      studioId: opts.studioId,
      paymentLinkId: opts.linkId,
      netAmount: opts.netAmount,
      processingFee: opts.processingFee,
      grossAmount: opts.grossAmount,
      createdAt: now,
    });
  });
}
