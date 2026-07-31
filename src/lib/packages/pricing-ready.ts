/** True when a package/quote has no usable priced tiers (AURA-135). */
export function hasUnsetPricing(
  tiers: ReadonlyArray<{ price?: number }> | null | undefined,
): boolean {
  if (!tiers?.length) return true;
  return tiers.some((t) => !Number.isFinite(Number(t.price)) || Number(t.price) <= 0);
}

export function confirmUnsetPricing(kind: "create" | "send") {
  return {
    title:
      kind === "create"
        ? "Create quote with $0 tiers?"
        : "Send with $0 tiers?",
    message: "One or more tiers are $0.",
    confirmLabel: "Continue",
    tone: "neutral" as const,
  };
}
