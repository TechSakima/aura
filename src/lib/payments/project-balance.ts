import type { AuraDatabase, Invoice, Proposal } from "@/lib/types";

export function isDepositInvoiceTitle(title: string) {
  return /^deposit\b/i.test(title.trim());
}

export function isBalanceInvoiceTitle(title: string) {
  return /^balance\b/i.test(title.trim());
}

/** Quoted package total for a project (accepted tier, else first tier). */
export function projectQuotedTotal(
  proposals: Pick<
    Proposal,
    "projectId" | "status" | "selectedTierId" | "tiers"
  >[],
  projectId: string,
): number | null {
  const accepted = proposals.find(
    (p) => p.projectId === projectId && p.status === "accepted",
  );
  if (!accepted?.tiers?.length) return null;
  const tier =
    accepted.tiers.find((t) => t.id === accepted.selectedTierId) ||
    accepted.tiers[0];
  const price = Number(tier?.price);
  return Number.isFinite(price) && price > 0 ? price : null;
}

/** Remaining net owed: quote total − paidAmount (floored at 0). */
export function projectRemainingBalance(opts: {
  quotedTotal: number | null;
  paidAmount?: number;
}): number | null {
  if (opts.quotedTotal == null) return null;
  return Math.max(0, opts.quotedTotal - Number(opts.paidAmount || 0));
}

export function projectHasDepositPaid(
  db: Pick<AuraDatabase, "invoices" | "proposals">,
  projectId: string,
): boolean {
  const depositInvoicePaid = db.invoices.some(
    (i) =>
      i.projectId === projectId &&
      i.status === "paid" &&
      isDepositInvoiceTitle(i.title),
  );
  if (depositInvoicePaid) return true;
  const depositReceived = db.proposals.some(
    (p) =>
      p.projectId === projectId && p.depositStatus === "received",
  );
  if (depositReceived) return true;
  // Legacy: any paid non-balance invoice for the project
  return db.invoices.some(
    (i) =>
      i.projectId === projectId &&
      i.status === "paid" &&
      !isBalanceInvoiceTitle(i.title),
  );
}

export function unpaidBalanceInvoice(
  invoices: Invoice[],
  projectId: string,
): Invoice | undefined {
  return invoices.find(
    (i) =>
      i.projectId === projectId &&
      isBalanceInvoiceTitle(i.title) &&
      i.status !== "paid" &&
      i.status !== "canceled",
  );
}
