import type { Studio, StudioPaymentDefaults } from "@/lib/types";

export const DEFAULT_LINK_TITLE = "Deposit";

export const DEFAULT_PAYMENT_DEFAULTS: StudioPaymentDefaults = {
  defaultLinkTitle: DEFAULT_LINK_TITLE,
};

export function clampDepositAmount(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return Math.round(n * 100) / 100;
}

export function normalizePaymentDefaults(
  raw?: Partial<StudioPaymentDefaults> | null,
): StudioPaymentDefaults {
  const title = String(raw?.defaultLinkTitle ?? DEFAULT_LINK_TITLE)
    .trim()
    .slice(0, 80);
  const amount = clampDepositAmount(raw?.defaultDepositAmount);
  return {
    defaultLinkTitle: title || DEFAULT_LINK_TITLE,
    ...(amount != null ? { defaultDepositAmount: amount } : {}),
  };
}

export function studioPaymentDefaults(studio: Studio): StudioPaymentDefaults {
  return normalizePaymentDefaults(studio.paymentDefaults);
}
