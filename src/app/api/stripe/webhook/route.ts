import { NextResponse } from "next/server";
import type Stripe from "stripe";
import {
  applyPaymentReversal,
  findStudioPaymentTx,
  recordPaymentLinkCharge,
  restorePaymentAfterDisputeWon,
} from "@/lib/db/payments";
import {
  amountsFromCheckoutSession,
  constructStripeEvent,
  getStripe,
} from "@/lib/stripe";
import { emailPaymentReceipt, notifyStudio } from "@/lib/notify/send";
import { getStudioDoc } from "@/lib/db/store";

export const runtime = "nodejs";

function paymentIntentId(
  value: string | Stripe.PaymentIntent | null | undefined,
): string | undefined {
  if (!value) return undefined;
  return typeof value === "string" ? value : value.id;
}

async function studioIdFromPaymentIntent(piId: string) {
  const stripe = getStripe();
  if (!stripe) return null;
  try {
    const pi = await stripe.paymentIntents.retrieve(piId);
    const studioId = pi.metadata?.studioId?.trim();
    if (!studioId) return null;
    return {
      studioId,
      paymentLinkId: pi.metadata?.paymentLinkId || undefined,
      projectId: pi.metadata?.projectId || undefined,
    };
  } catch {
    return null;
  }
}

async function resolveStudioForStripeIds(opts: {
  stripeCheckoutSessionId?: string;
  stripePaymentIntentId?: string;
  sessionMetadata?: Stripe.Metadata | null;
}) {
  const fromMeta = opts.sessionMetadata?.studioId?.trim();
  if (fromMeta) return fromMeta;

  const hit = await findStudioPaymentTx({
    stripeCheckoutSessionId: opts.stripeCheckoutSessionId,
    stripePaymentIntentId: opts.stripePaymentIntentId,
  });
  if (hit) return hit.studioId;

  if (opts.stripePaymentIntentId) {
    const fromPi = await studioIdFromPaymentIntent(opts.stripePaymentIntentId);
    if (fromPi?.studioId) return fromPi.studioId;
  }
  return null;
}

async function recordPaidCheckoutSession(
  session: Stripe.Checkout.Session,
  eventId: string,
) {
  if (session.payment_status !== "paid") {
    return { skipped: true as const, reason: "not_paid" };
  }

  const studioId = session.metadata?.studioId;
  const paymentLinkId = session.metadata?.paymentLinkId;
  if (!studioId || !paymentLinkId) {
    return { skipped: true as const, reason: "missing_meta" };
  }

  const amounts = amountsFromCheckoutSession(session);
  if (!amounts || amounts.grossCents <= 0) {
    return { skipped: true as const, reason: "no_amount" };
  }
  const { netAmount, processingFee, grossAmount } = amounts;
  const projectId = session.metadata?.projectId || undefined;
  const pi = paymentIntentId(session.payment_intent);

  const recorded = await recordPaymentLinkCharge({
    studioId,
    linkId: paymentLinkId,
    netAmount,
    processingFee,
    grossAmount,
    projectId: projectId || undefined,
    stripePaymentIntentId: pi,
    stripeCheckoutSessionId: session.id,
  });

  if (recorded.duplicate) {
    return { duplicate: true as const };
  }

  const studio = await getStudioDoc(studioId);
  await notifyStudio({
    studioId,
    type: "payment_received",
    title: "Payment received",
    body: `$${netAmount.toFixed(2)} net (client paid $${grossAmount.toFixed(2)})`,
    href: projectId ? `/admin/projects/${projectId}` : "/admin/payments",
  });

  const email =
    session.customer_details?.email || session.customer_email || undefined;
  if (email) {
    await emailPaymentReceipt({
      studioId,
      to: email,
      clientName:
        session.customer_details?.name ||
        session.metadata?.customerName ||
        undefined,
      title: "Payment",
      netAmount,
      processingFee,
      grossAmount,
    });
  }

  if (studio && !studio.stripeOnboardingComplete && studio.stripeAccountId) {
    const { updateStudioDb } = await import("@/lib/db/store");
    await updateStudioDb(studioId, (db) => {
      db.studio.stripeOnboardingComplete = true;
    });
  }

  return { recorded: true as const, eventId };
}

async function handleMoneyReversal(opts: {
  event: Stripe.Event;
  reason: "refund" | "dispute" | "async_failed";
  studioId: string | null;
  stripeCheckoutSessionId?: string;
  stripePaymentIntentId?: string;
  refundedGrossTotal?: number;
  notifyTitle: string;
  notifyBody: string;
}) {
  if (!opts.studioId) {
    return { skipped: true as const, reason: "no_studio" };
  }

  const result = await applyPaymentReversal({
    studioId: opts.studioId,
    reason: opts.reason,
    stripeEventId: opts.event.id,
    stripeCheckoutSessionId: opts.stripeCheckoutSessionId,
    stripePaymentIntentId: opts.stripePaymentIntentId,
    refundedGrossTotal: opts.refundedGrossTotal,
  });

  if (result.missing || result.duplicate || !result.applied) {
    return result;
  }

  await notifyStudio({
    studioId: opts.studioId,
    type: "payment_reversed",
    title: opts.notifyTitle,
    body: opts.notifyBody,
    href: result.projectId
      ? `/admin/projects/${result.projectId}`
      : "/admin/payments",
  });

  return result;
}

export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }
  const rawBody = Buffer.from(await req.arrayBuffer());
  let event: Stripe.Event;
  try {
    const constructed = constructStripeEvent(rawBody, signature);
    if (!constructed) {
      return NextResponse.json(
        { error: "Webhook not configured" },
        { status: 500 },
      );
    }
    event = constructed;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    await recordPaidCheckoutSession(session, event.id);
  }

  if (event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data.object as Stripe.Checkout.Session;
    await recordPaidCheckoutSession(session, event.id);
  }

  if (event.type === "checkout.session.async_payment_failed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const pi = paymentIntentId(session.payment_intent);
    const studioId = await resolveStudioForStripeIds({
      stripeCheckoutSessionId: session.id,
      stripePaymentIntentId: pi,
      sessionMetadata: session.metadata,
    });
    await handleMoneyReversal({
      event,
      reason: "async_failed",
      studioId,
      stripeCheckoutSessionId: session.id,
      stripePaymentIntentId: pi,
      notifyTitle: "Payment failed",
      notifyBody: "An async payment did not clear. Deposit marked unpaid.",
    });
  }

  if (event.type === "charge.refunded") {
    const charge = event.data.object as Stripe.Charge;
    const pi = paymentIntentId(charge.payment_intent);
    const studioId = await resolveStudioForStripeIds({
      stripePaymentIntentId: pi,
    });
    const refundedGrossTotal = (charge.amount_refunded || 0) / 100;
    await handleMoneyReversal({
      event,
      reason: "refund",
      studioId,
      stripePaymentIntentId: pi,
      refundedGrossTotal,
      notifyTitle: "Payment refunded",
      notifyBody:
        refundedGrossTotal > 0
          ? `Refund recorded ($${refundedGrossTotal.toFixed(2)} gross).`
          : "Refund recorded.",
    });
  }

  if (event.type === "charge.dispute.created") {
    const dispute = event.data.object as Stripe.Dispute;
    const pi = paymentIntentId(dispute.payment_intent);
    const chargeId =
      typeof dispute.charge === "string" ? dispute.charge : dispute.charge?.id;
    let studioId = await resolveStudioForStripeIds({
      stripePaymentIntentId: pi,
    });
    if (!studioId && chargeId) {
      const stripe = getStripe();
      if (stripe) {
        try {
          const charge = await stripe.charges.retrieve(chargeId);
          studioId = await resolveStudioForStripeIds({
            stripePaymentIntentId: paymentIntentId(charge.payment_intent),
          });
        } catch {
          /* ignore */
        }
      }
    }
    await handleMoneyReversal({
      event,
      reason: "dispute",
      studioId,
      stripePaymentIntentId: pi,
      notifyTitle: "Payment disputed",
      notifyBody: "A card dispute was opened. Deposit marked unpaid.",
    });
  }

  if (event.type === "charge.dispute.closed") {
    const dispute = event.data.object as Stripe.Dispute;
    if (dispute.status === "won") {
      const pi = paymentIntentId(dispute.payment_intent);
      const studioId = await resolveStudioForStripeIds({
        stripePaymentIntentId: pi,
      });
      if (studioId) {
        const result = await restorePaymentAfterDisputeWon({
          studioId,
          stripeEventId: event.id,
          stripePaymentIntentId: pi,
        });
        if (result.restored) {
          await notifyStudio({
            studioId,
            type: "payment_received",
            title: "Dispute won",
            body: "Funds restored. Deposit marked paid again.",
            href: "/admin/payments",
          });
        }
      }
    }
  }

  if (event.type === "account.updated") {
    const account = event.data.object as Stripe.Account;
    const studioId = account.metadata?.studioId;
    if (studioId && account.charges_enabled) {
      const { updateStudioDb } = await import("@/lib/db/store");
      await updateStudioDb(studioId, (db) => {
        db.studio.stripeOnboardingComplete = true;
        db.studio.stripeAccountId = account.id;
      });
    }
  }

  return NextResponse.json({ received: true });
}
