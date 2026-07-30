/**
 * Aura payment fee gross-up (AURA-015).
 *
 * ## Model
 * Approximate **US domestic card** pricing: **2.9% + $0.30**.
 * Checkout uses **destination charges** with `application_fee_amount: 0` (Aura
 * takes no platform cut). Stripe’s processing fee comes out of the charged
 * total; we charge a grossed-up amount so the connected studio **approximately**
 * receives the listed net.
 *
 * ## Why not Stripe fee estimates?
 * There is no reliable pre-charge Fee Estimates API for this Checkout /
 * destination-charge path. Exact fees land on the BalanceTransaction after
 * payment. Public pay preview and checkout creation share this same formula;
 * recorded money uses Checkout `amount_total` (AURA-009).
 *
 * ## Known limits (intentional)
 * - **Currency:** USD only (`DEFAULT_PAYMENT_CURRENCY`). The fixed fee is in
 *   USD major units; other currencies need their own rate tables later.
 * - **Card mix:** International, Amex, and some premium cards cost more than
 *   2.9%+$0.30 — studio may net slightly less than the listed amount.
 * - **Connect pricing:** Platform-specific Stripe pricing can differ from the
 *   published US online rate; treat this as an estimate, not a guarantee.
 * - **Multi-currency / FX:** Deferred — pass `currency` into helpers once
 *   Checkout and Connect settlement support more than USD.
 */

/** US online card rate used for gross-up estimates (not a Stripe API quote). */
export const STRIPE_PERCENT = 0.029;
/** Fixed fee in major units of {@link DEFAULT_PAYMENT_CURRENCY} (USD dollars). */
export const STRIPE_FIXED = 0.3;

/** Only supported Checkout currency until multi-currency lands. */
export const DEFAULT_PAYMENT_CURRENCY = "usd" as const;

export type SupportedPaymentCurrency = typeof DEFAULT_PAYMENT_CURRENCY;

export function assertPaymentCurrency(
  currency: string = DEFAULT_PAYMENT_CURRENCY,
): SupportedPaymentCurrency {
  const normalized = currency.trim().toLowerCase();
  if (normalized !== DEFAULT_PAYMENT_CURRENCY) {
    throw new Error(
      `Unsupported payment currency “${currency}” (Aura supports USD only for now)`,
    );
  }
  return DEFAULT_PAYMENT_CURRENCY;
}

export type FeeBreakdown = {
  netAmount: number;
  processingFee: number;
  grossAmount: number;
  /** cents for Stripe APIs */
  grossCents: number;
  currency: SupportedPaymentCurrency;
};

/** Client pays processing fee: charge so studio receives `netMajorUnits`. */
export function grossUpAmount(
  netMajorUnits: number,
  opts?: { currency?: string },
): FeeBreakdown {
  const currency = assertPaymentCurrency(
    opts?.currency ?? DEFAULT_PAYMENT_CURRENCY,
  );
  const net = Math.max(0, netMajorUnits);
  const gross =
    Math.ceil(((net + STRIPE_FIXED) / (1 - STRIPE_PERCENT)) * 100) / 100;
  const processingFee = Math.round((gross - net) * 100) / 100;
  return {
    netAmount: net,
    processingFee,
    grossAmount: gross,
    grossCents: Math.round(gross * 100),
    currency,
  };
}

/**
 * Fee/net estimated from the charged total (session has no Stripe fee field).
 * Gross must come from Stripe `amount_total` only — never from client/metadata.
 */
export function amountsFromCheckoutSession(
  session: {
    amount_total: number | null;
    currency?: string | null;
  },
  opts?: { currency?: string },
): FeeBreakdown | null {
  const currency = assertPaymentCurrency(
    opts?.currency ?? session.currency ?? DEFAULT_PAYMENT_CURRENCY,
  );
  const grossCents = session.amount_total;
  if (grossCents == null || grossCents < 0) return null;
  const grossAmount = Math.round(grossCents) / 100;
  const processingFee =
    Math.round((grossAmount * STRIPE_PERCENT + STRIPE_FIXED) * 100) / 100;
  const netAmount = Math.max(
    0,
    Math.round((grossAmount - processingFee) * 100) / 100,
  );
  return {
    grossAmount,
    processingFee,
    netAmount,
    grossCents,
    currency,
  };
}
