import { COL } from "@/lib/db/collections";
import { deleteShootCascade } from "@/lib/db/delete-shoot";
import { deleteStudioDocs, readStudioDb, updateStudioDb } from "@/lib/db/store";

/** Soft-archive a project and its sessions. */
export async function archiveProject(
  studioId: string,
  projectId: string,
): Promise<boolean> {
  const now = new Date().toISOString();
  const ok = await updateStudioDb(studioId, (db) => {
    const p = db.projects.find((x) => x.id === projectId);
    if (!p) return false;
    p.stage = "archived";
    p.updatedAt = now;
    for (const s of db.sessions.filter((x) => x.projectId === projectId)) {
      s.status = "archived";
      s.updatedAt = now;
    }
    return true;
  });
  return Boolean(ok);
}

/**
 * Restore an archived project (AURA-101).
 * Sessions keep `archived` until edited — never force every session to `booked`.
 */
export async function unarchiveProject(
  studioId: string,
  projectId: string,
  restoreStage:
    | "inquiry"
    | "booked"
    | "in_progress"
    | "delivered"
    | "completed" = "booked",
): Promise<boolean> {
  const now = new Date().toISOString();
  const ok = await updateStudioDb(studioId, (db) => {
    const p = db.projects.find((x) => x.id === projectId);
    if (!p) return false;
    p.stage = restoreStage;
    p.updatedAt = now;
    return true;
  });
  return Boolean(ok);
}

/** Hard-delete a project and cascade related data. */
export async function deleteProjectCascade(
  studioId: string,
  projectId: string,
): Promise<boolean> {
  const db = await readStudioDb(studioId);
  const project = db.projects.find((p) => p.id === projectId);
  if (!project) return false;

  const sessionIds = db.sessions
    .filter((s) => s.projectId === projectId)
    .map((s) => s.id);

  for (const sessionId of sessionIds) {
    await deleteShootCascade(studioId, sessionId);
  }

  const fresh = await readStudioDb(studioId);
  const questionnaireIds = fresh.questionnaireResponses
    .filter((r) => r.projectId === projectId)
    .map((r) => r.id);
  const contractIds = fresh.contracts
    .filter((c) => c.projectId === projectId)
    .map((c) => c.id);
  const bookingIds = fresh.bookingRequests
    .filter((b) => b.projectId === projectId)
    .map((b) => b.id);
  const invoiceIds = fresh.invoices
    .filter((i) => i.projectId === projectId)
    .map((i) => i.id);
  const linkIds = fresh.paymentLinks
    .filter((l) => l.projectId === projectId)
    .map((l) => l.id);
  const txIds = fresh.paymentTransactions
    .filter((t) => t.projectId === projectId)
    .map((t) => t.id);
  const proposalIds = fresh.proposals
    .filter((p) => p.projectId === projectId)
    .map((p) => p.id);
  const orphanSessionIds = fresh.sessions
    .filter((s) => s.projectId === projectId)
    .map((s) => s.id);

  const del = { studioId };
  await deleteStudioDocs(COL.questionnaireResponses, questionnaireIds, del);
  await deleteStudioDocs(COL.contracts, contractIds, del);
  await deleteStudioDocs(COL.bookingRequests, bookingIds, del);
  await deleteStudioDocs(COL.invoices, invoiceIds, del);
  await deleteStudioDocs(COL.paymentLinks, linkIds, del);
  await deleteStudioDocs(COL.paymentTransactions, txIds, del);
  await deleteStudioDocs(COL.proposals, proposalIds, del);
  await deleteStudioDocs(COL.projectSessions, orphanSessionIds, del);
  await deleteStudioDocs(COL.shoots, orphanSessionIds, del);
  await deleteStudioDocs(COL.projects, [projectId], del);
  await deleteStudioDocs(COL.clients, [projectId], del);

  // No trailing updateStudioDb — tombstones block stale RMW resurrection (AURA-099).
  return true;
}
