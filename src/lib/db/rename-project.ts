import type { AuraDatabase } from "@/lib/types";

export type ProjectRenameMode = "auto" | "all";

function replaceNameToken(text: string, from: string, to: string): string {
  if (!text.includes(from)) return text;
  return text.split(from).join(to);
}

/**
 * When a project is renamed (AURA-102):
 * - `auto` (default): only denormalized titles that match Aura’s generators
 *   (`{name} gallery`, `Deposit — {name}`, `Balance — {name}`, …).
 * - `all`: also rewrite gallery/invoice/payment titles & descriptions that
 *   contain the old name (opt-in from project edit).
 * Booking guest `name` updates only on exact match (client name ≠ free text title).
 */
export function cascadeProjectRename(
  db: AuraDatabase,
  projectId: string,
  oldName: string,
  newName: string,
  mode: ProjectRenameMode = "auto",
): void {
  const from = oldName.trim();
  const to = newName.trim();
  if (!from || !to || from === to) return;

  const oldGalleryTitle = `${from} gallery`;
  const newGalleryTitle = `${to} gallery`;
  for (const g of db.galleries) {
    if (g.projectId !== projectId) continue;
    if (g.title === oldGalleryTitle) {
      g.title = newGalleryTitle;
    } else if (mode === "all") {
      g.title = replaceNameToken(g.title, from, to);
    }
  }

  const oldDepositTitle = `Deposit — ${from}`;
  const newDepositTitle = `Deposit — ${to}`;
  const oldDepositDesc = `Deposit for ${from}`;
  const newDepositDesc = `Deposit for ${to}`;
  const oldBalanceTitle = `Balance — ${from}`;
  const newBalanceTitle = `Balance — ${to}`;
  const oldBalanceDesc = `Remaining balance for ${from}`;
  const newBalanceDesc = `Remaining balance for ${to}`;

  for (const inv of db.invoices) {
    if (inv.projectId !== projectId) continue;
    if (inv.title === oldDepositTitle) inv.title = newDepositTitle;
    else if (inv.title === oldBalanceTitle) inv.title = newBalanceTitle;
    else if (mode === "all") inv.title = replaceNameToken(inv.title, from, to);
  }

  for (const link of db.paymentLinks) {
    if (link.projectId !== projectId) continue;
    if (link.title === oldDepositTitle) link.title = newDepositTitle;
    else if (link.title === oldBalanceTitle) link.title = newBalanceTitle;
    else if (mode === "all") link.title = replaceNameToken(link.title, from, to);

    if (link.description === oldDepositDesc) {
      link.description = newDepositDesc;
    } else if (link.description === oldBalanceDesc) {
      link.description = newBalanceDesc;
    } else if (mode === "all" && link.description) {
      link.description = replaceNameToken(link.description, from, to);
    }
  }

  for (const b of db.bookingRequests) {
    if (b.projectId !== projectId) continue;
    if (b.name === from) b.name = to;
  }
}
