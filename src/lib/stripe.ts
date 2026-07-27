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

function stripeSecretKey() {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  return key || null;
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

let stripeClient: Stripe | null | undefined;

/** Lazy Stripe client — avoid constructing during build when env is missing. */
export function getStripe(): Stripe | null {
  if (stripeClient !== undefined) return stripeClient;
  const key = stripeSecretKey();
  if (!key) {
    stripeClient = null;
    return null;
  }
  stripeClient = new Stripe(key, {
    typescript: true,
  });
  return stripeClient;
}

export function stripeConfigured() {
  return Boolean(stripeSecretKey());
}

/** Map Stripe errors to a safe client message. */
export function stripeErrorMessage(e: unknown): string {
  if (e && typeof e === "object") {
    const err = e as {
      message?: string;
      type?: string;
      raw?: { message?: string };
    };
    const msg = err.raw?.message || err.message;
    if (msg) return msg;
  }
  return "Stripe request failed";
}

/**
 * Create a connected account shaped like Express (Stripe-hosted onboarding +
 * Express Dashboard). Prefer controller properties; fall back to legacy type.
 */
export async function createConnectAccount(opts: {
  email?: string;
  studioId: string;
}) {
  const stripe = getStripe();
  if (!stripe) throw new Error("Stripe is not configured");

  const shared = {
    email: opts.email || undefined,
    capabilities: {
      card_payments: { requested: true as const },
      transfers: { requested: true as const },
    },
    metadata: { studioId: opts.studioId },
  };

  try {
    return await stripe.accounts.create({
      ...shared,
      controller: {
        stripe_dashboard: { type: "express" },
        fees: { payer: "application" },
        losses: { payments: "application" },
        requirement_collection: "stripe",
      },
    });
  } catch (e) {
    // Platforms already on legacy Express keep working.
    console.warn(
      "[stripe] controller account create failed, trying type=express:",
      stripeErrorMessage(e),
    );
    return stripe.accounts.create({
      ...shared,
      type: "express",
    });
  }
}

export async function createConnectOnboardingLink(opts: {
  accountId: string;
  refreshUrl: string;
  returnUrl: string;
}) {
  const stripe = getStripe();
  if (!stripe) throw new Error("Stripe is not configured");

  return stripe.accountLinks.create({
    account: opts.accountId,
    refresh_url: opts.refreshUrl,
    return_url: opts.returnUrl,
    type: "account_onboarding",
  });
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
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!stripe || !secret) return null;
  return stripe.webhooks.constructEvent(rawBody, signature, secret);
}
