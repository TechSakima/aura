import type { AuraDatabase } from "@/lib/types";

/** Mark a gallery live and update linked shoot status. */
export function markGalleryLive(db: AuraDatabase, galleryId: string) {
  const g = db.galleries.find((x) => x.id === galleryId);
  if (!g) return null;
  const now = new Date();
  g.status = "live";
  g.liveAt = now.toISOString();
  if (!g.expiresAt || new Date(g.expiresAt) < now) {
    g.expiresAt = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString();
  }
  g.updatedAt = now.toISOString();
  const sessionId = g.sessionId || g.shootId;
  const session = sessionId
    ? db.sessions.find((s) => s.id === sessionId)
    : null;
  if (session) {
    session.status = "delivered";
    session.updatedAt = now.toISOString();
  }
  return g;
}
