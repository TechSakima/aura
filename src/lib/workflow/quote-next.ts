import type { AuraDatabase } from "@/lib/types";

/** Client-facing next actions after a quote is accepted (AURA-027). */
export type QuoteAcceptNext = {
  /** Earliest incomplete book step after pricing. */
  nextStep: "contract" | "deposit";
  /** Public sign path when an unsigned contract exists. */
  contractHref?: string;
  /** Public pay path when a project deposit link exists. */
  depositHref?: string;
};

/**
 * Resolve contract / deposit links for a project after quote accept.
 * Does not invent entities — only surfaces what the studio already created.
 */
export function resolveQuoteAcceptNext(
  db: Pick<AuraDatabase, "contracts" | "paymentLinks" | "invoices">,
  projectId: string | undefined | null,
): QuoteAcceptNext {
  if (!projectId) {
    return { nextStep: "contract" };
  }

  const unsigned = db.contracts.find(
    (c) =>
      c.projectId === projectId &&
      c.status !== "completed" &&
      c.status !== "canceled" &&
      Boolean(c.token),
  );
  const depositLink = db.paymentLinks.find(
    (l) => l.projectId === projectId && !l.archived,
  );
  const depositPaid = db.invoices.some(
    (i) => i.projectId === projectId && i.status === "paid",
  );

  const contractHref = unsigned ? `/c/${unsigned.token}` : undefined;
  const depositHref =
    depositLink && !depositPaid ? `/pay/${depositLink.id}` : undefined;

  if (contractHref) {
    return { nextStep: "contract", contractHref, depositHref };
  }
  if (depositHref) {
    return { nextStep: "deposit", depositHref };
  }
  return { nextStep: "contract" };
}
