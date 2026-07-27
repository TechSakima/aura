import { nanoid } from "nanoid";
import { updateStudioDb } from "@/lib/db/store";
import type { AnalyticsEventType } from "@/lib/types";

export async function recordEvent(input: {
  type: AnalyticsEventType;
  studioId?: string;
  galleryId?: string;
  proposalId?: string;
  shootId?: string;
  photoId?: string;
  meta?: Record<string, string | number | boolean>;
}) {
  if (!input.studioId) return;
  await updateStudioDb(input.studioId, (db) => {
    db.analyticsEvents.push({
      id: nanoid(),
      studioId: input.studioId,
      type: input.type,
      galleryId: input.galleryId,
      proposalId: input.proposalId,
      shootId: input.shootId,
      photoId: input.photoId,
      meta: input.meta,
      at: new Date().toISOString(),
    });
  });
}
