/** Defaults when creating/editing customer-chooses payment links (AURA-134). */
export const OPEN_LINK_DEFAULT_MIN = 1;
export const OPEN_LINK_DEFAULT_MAX = 500;

export function parseOpenLinkLimits(input: {
  minAmount?: unknown;
  maxAmount?: unknown;
}): { minAmount: number; maxAmount: number } | { error: string } {
  const min =
    input.minAmount == null || input.minAmount === ""
      ? OPEN_LINK_DEFAULT_MIN
      : Number(input.minAmount);
  const max =
    input.maxAmount == null || input.maxAmount === ""
      ? OPEN_LINK_DEFAULT_MAX
      : Number(input.maxAmount);
  if (!Number.isFinite(min) || min <= 0) {
    return { error: "Min must be greater than 0" };
  }
  if (!Number.isFinite(max) || max <= 0) {
    return { error: "Max must be greater than 0" };
  }
  if (min > max) {
    return { error: "Min cannot exceed max" };
  }
  return {
    minAmount: Math.round(min * 100) / 100,
    maxAmount: Math.round(max * 100) / 100,
  };
}
