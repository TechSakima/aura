import Stripe from "stripe";

/** Approximate US card rate used to gross-up so studio nets `netDollars`. */
export const STRIPE_PERCENT = 0.029;
export const STRIPE_FIXED = 0.3;

function appOrigin() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

/** Client pays processing fee: charge so studio receives `netDollars`. */
export function grossUpAmount(netDollars: number) {
  const net = Math.max(0, netDollars);
  const gross =
    Math.ceil(((net + STRIPE_FIXED) / (1 - STRIPE_PERCENT)) * 100) / 100;
  const processingFee = Math.round((gross - net) * 100) / 100;
  return {
    netAmount: net,
    processingFee,
    grossAmount: gross,
    /** cents for Stripe APIs */
    grossCents: Math.round(gross * 100),
  };
}

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}

export async function createPaymentLinkCheckout(opts: {
  stripeAccountId: string;
  paymentLinkId: string;
  studioId: string;
  title: string;
  description?: string;
  netAmount: number;
  customerEmail?: string;
  customerName?: string;
  projectId?: string;
}) {
  const stripe = getStripe();
  if (!stripe) return null;

  const breakdown = grossUpAmount(opts.netAmount);
  const origin = appOrigin();
  const feeLine = `Studio receives $${breakdown.netAmount.toFixed(2)}. Processing fee $${breakdown.processingFee.toFixed(2)}.`;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: opts.customerEmail || undefined,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: breakdown.grossCents,
          product_data: {
            name: opts.title,
            description: opts.description
              ? `${opts.description} — ${feeLine}`
              : feeLine,
          },
        },
      },
    ],
    // Destination charge: $0 Aura platform fee; Stripe fee from total ≈ studio nets listed amount
    payment_intent_data: {
      application_fee_amount: 0,
      transfer_data: {
        destination: opts.stripeAccountId,
      },
      metadata: {
        studioId: opts.studioId,
        paymentLinkId: opts.paymentLinkId,
        projectId: opts.projectId || "",
        netAmount: String(breakdown.netAmount),
        processingFee: String(breakdown.processingFee),
        grossAmount: String(breakdown.grossAmount),
      },
    },
    metadata: {
      studioId: opts.studioId,
      paymentLinkId: opts.paymentLinkId,
      projectId: opts.projectId || "",
      netAmount: String(breakdown.netAmount),
      processingFee: String(breakdown.processingFee),
      grossAmount: String(breakdown.grossAmount),
      customerName: opts.customerName || "",
    },
    success_url: `${origin}/pay/${opts.paymentLinkId}?paid=1`,
    cancel_url: `${origin}/pay/${opts.paymentLinkId}?canceled=1`,
  });

  return { session, breakdown };
}

export function constructStripeEvent(
  rawBody: string | Buffer,
  signature: string,
) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) return null;
  return stripe.webhooks.constructEvent(rawBody, signature, secret);
}
