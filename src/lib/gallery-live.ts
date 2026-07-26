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
  const shoot = db.shoots.find((s) => s.id === g.shootId);
  if (shoot) {
    shoot.status = "delivered";
    shoot.updatedAt = now.toISOString();
  }
  return g;
}
