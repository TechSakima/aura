import {
  galleryExpiryFromNow,
  studioDeliveryDefaults,
} from "@/lib/delivery-defaults";
import type { AuraDatabase } from "@/lib/types";
import { applyGalleryLiveProjectSideEffects } from "@/lib/workflow/state-rules";

/** Mark a gallery live and update linked shoot status. */
export function markGalleryLive(db: AuraDatabase, galleryId: string) {
  const g = db.galleries.find((x) => x.id === galleryId);
  if (!g) return null;
  const now = new Date();
  g.status = "live";
  g.liveAt = now.toISOString();
  if (!g.expiresAt || new Date(g.expiresAt) < now) {
    const days = studioDeliveryDefaults(db.studio).expiryDays;
    g.expiresAt = galleryExpiryFromNow(days, now);
  }
  g.updatedAt = now.toISOString();
  const sessionId = g.sessionId || g.shootId;
  const session = sessionId
    ? db.sessions.find((s) => s.id === sessionId)
    : null;
  if (session) {
    session.status = "delivered";
    session.updatedAt = now.toISOString();
    applyGalleryLiveProjectSideEffects(db, session.projectId);
  }
  return g;
}
