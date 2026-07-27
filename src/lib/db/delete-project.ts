import { deleteShootCascade } from "@/lib/db/delete-shoot";
import { readStudioDb, updateStudioDb } from "@/lib/db/store";

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

/** Restore an archived project (sessions stay archived until edited). */
export async function unarchiveProject(
  studioId: string,
  projectId: string,
  restoreStage: "inquiry" | "booked" | "in_progress" | "delivered" | "completed" = "booked",
): Promise<boolean> {
  const now = new Date().toISOString();
  const ok = await updateStudioDb(studioId, (db) => {
    const p = db.projects.find((x) => x.id === projectId);
    if (!p) return false;
    p.stage = restoreStage;
    p.updatedAt = now;
    for (const s of db.sessions.filter((x) => x.projectId === projectId)) {
      if (s.status === "archived") {
        s.status = "booked";
        s.updatedAt = now;
      }
    }
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

  await updateStudioDb(studioId, (d) => {
    d.questionnaireResponses = d.questionnaireResponses.filter(
      (r) => r.projectId !== projectId,
    );
    d.contracts = d.contracts.filter((c) => c.projectId !== projectId);
    d.bookingRequests = d.bookingRequests.filter(
      (b) => b.projectId !== projectId,
    );
    d.invoices = d.invoices.filter((i) => i.projectId !== projectId);
    d.paymentLinks = d.paymentLinks.filter((l) => l.projectId !== projectId);
    d.paymentTransactions = d.paymentTransactions.filter(
      (t) => t.projectId !== projectId,
    );
    // Proposals may remain if session cascade missed project-only rows
    d.proposals = d.proposals.filter((p) => p.projectId !== projectId);
    d.projects = d.projects.filter((p) => p.id !== projectId);
    d.clients = d.projects;
    // Drop any orphan sessions that still reference this project
    d.sessions = d.sessions.filter((s) => s.projectId !== projectId);
    d.shoots = d.sessions.map((s) => ({
      ...s,
      clientId: s.projectId,
      shootDate: s.startsAt,
    }));
  });

  return true;
}
