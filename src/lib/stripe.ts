import Stripe from "stripe";

/** Approximate US card rate used to gross-up so studio nets `netDollars`. */
export const STRIPE_PERCENT = 0.029;
export const STRIPE_FIXED = 0.3;

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
