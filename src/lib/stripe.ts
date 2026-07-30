import Stripe from "stripe";
import {
  DEFAULT_PAYMENT_CURRENCY,
  grossUpAmount,
} from "@/lib/stripe-fees";

export {
  STRIPE_PERCENT,
  STRIPE_FIXED,
  DEFAULT_PAYMENT_CURRENCY,
  assertPaymentCurrency,
  grossUpAmount,
  amountsFromCheckoutSession,
} from "@/lib/stripe-fees";

function appOrigin() {
  // Re-export path — stripe helpers use notify appOrigin semantics via local copy
  // to avoid circular imports in edge cases; keep in sync with notify/send.ts
  const candidates = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.APP_URL,
  ].filter(Boolean) as string[];

  for (const raw of candidates) {
    try {
      const cleaned = raw.replace(/\/$/, "");
      const host = new URL(cleaned).hostname;
      if (
        host !== "0.0.0.0" &&
        host !== "127.0.0.1" &&
        host !== "localhost" &&
        !host.endsWith(".internal")
      ) {
        return cleaned;
      }
    } catch {
      /* try next */
    }
  }

  return process.env.NODE_ENV === "production"
    ? "https://aura.stroburm.app"
    : "http://localhost:3000";
}

function stripeSecretKey() {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  return key || null;
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
  return "Payment request failed";
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
  studioName?: string;
  /** Stable idempotency key so double-submit doesn’t create duplicate Checkout Sessions (AURA-365). */
  idempotencyKey?: string;
}) {
  const stripe = getStripe();
  if (!stripe) return null;

  const breakdown = grossUpAmount(opts.netAmount);
  const origin = appOrigin();
  const productName = opts.studioName
    ? `Payment to ${opts.studioName}`
    : opts.title;
  const productDescription =
    opts.description ||
    `Includes card processing fee. You’ll be charged $${breakdown.grossAmount.toFixed(2)}.`;

  const session = await stripe.checkout.sessions.create(
    {
      mode: "payment",
      customer_email: opts.customerEmail || undefined,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: DEFAULT_PAYMENT_CURRENCY,
            unit_amount: breakdown.grossCents,
            product_data: {
              name: productName,
              description: productDescription,
            },
          },
        },
      ],
      // Destination charge: $0 Aura platform fee; Stripe fee from total ≈ studio
      // nets listed amount (see stripe-fees.ts / AURA-015 for estimate limits).
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
      success_url: `${origin}/pay/${opts.paymentLinkId}?paid=1&amount=${breakdown.grossAmount.toFixed(2)}`,
      cancel_url: `${origin}/pay/${opts.paymentLinkId}?canceled=1`,
    },
    opts.idempotencyKey
      ? { idempotencyKey: opts.idempotencyKey }
      : undefined,
  );

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
