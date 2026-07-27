import type { AuraDatabase } from "@/lib/types";

/**
 * When a project is renamed, update denormalized titles that were
 * auto-generated from the previous name (galleries, deposits, bookings).
 */
export function cascadeProjectRename(
  db: AuraDatabase,
  projectId: string,
  oldName: string,
  newName: string,
): void {
  const from = oldName.trim();
  const to = newName.trim();
  if (!from || !to || from === to) return;

  const oldGalleryTitle = `${from} gallery`;
  const newGalleryTitle = `${to} gallery`;
  for (const g of db.galleries) {
    if (g.projectId !== projectId) continue;
    if (g.title === oldGalleryTitle) g.title = newGalleryTitle;
  }

  const oldDepositTitle = `Deposit — ${from}`;
  const newDepositTitle = `Deposit — ${to}`;
  const oldDepositDesc = `Deposit for ${from}`;
  const newDepositDesc = `Deposit for ${to}`;

  for (const inv of db.invoices) {
    if (inv.projectId !== projectId) continue;
    if (inv.title === oldDepositTitle) inv.title = newDepositTitle;
  }

  for (const link of db.paymentLinks) {
    if (link.projectId !== projectId) continue;
    if (link.title === oldDepositTitle) link.title = newDepositTitle;
    if (link.description === oldDepositDesc) link.description = newDepositDesc;
  }

  for (const b of db.bookingRequests) {
    if (b.projectId !== projectId) continue;
    if (b.name === from) b.name = to;
  }
}
