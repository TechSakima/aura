import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { recordPaymentLinkCharge } from "@/lib/db/payments";
import { constructStripeEvent } from "@/lib/stripe";
import { emailPaymentReceipt, notifyStudio } from "@/lib/notify/send";
import { getStudioDoc } from "@/lib/db/store";

export const runtime = "nodejs";

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
    const studioId = session.metadata?.studioId;
    const paymentLinkId = session.metadata?.paymentLinkId;
    if (!studioId || !paymentLinkId) {
      return NextResponse.json({ ok: true, skipped: true });
    }
    const netAmount = Number(session.metadata?.netAmount || 0);
    const processingFee = Number(session.metadata?.processingFee || 0);
    const grossAmount = Number(session.metadata?.grossAmount || 0);
    const projectId = session.metadata?.projectId || undefined;
    const pi =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id;

    await recordPaymentLinkCharge({
      studioId,
      linkId: paymentLinkId,
      netAmount,
      processingFee,
      grossAmount,
      projectId: projectId || undefined,
      stripePaymentIntentId: pi,
      stripeCheckoutSessionId: session.id,
    });

    const studio = await getStudioDoc(studioId);
    await notifyStudio({
      studioId,
      type: "payment_received",
      title: "Payment received",
      body: `$${netAmount.toFixed(2)} net (client paid $${grossAmount.toFixed(2)})`,
      href: "/admin/payments",
    });

    const email =
      session.customer_details?.email ||
      session.customer_email ||
      undefined;
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

    // Mark Connect complete if we get successful payments
    if (studio && !studio.stripeOnboardingComplete && studio.stripeAccountId) {
      const { updateStudioDb } = await import("@/lib/db/store");
      await updateStudioDb(studioId, (db) => {
        db.studio.stripeOnboardingComplete = true;
      });
    }
  }

  if (event.type === "account.updated") {
    const account = event.data.object as Stripe.Account;
    const studioId = account.metadata?.studioId;
    if (studioId && account.charges_enabled) {
      const { updateStudioDb } = await import("@/lib/db/store");
      await updateStudioDb(studioId, (db) => {
        db.studio.stripeAccountId = account.id;
        db.studio.stripeOnboardingComplete = true;
      });
    }
  }

  return NextResponse.json({ received: true });
}
