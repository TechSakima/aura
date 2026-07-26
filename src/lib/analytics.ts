import { nanoid } from "nanoid";
import { updateDb } from "@/lib/db/store";
import type { AnalyticsEventType } from "@/lib/types";

export async function recordEvent(input: {
  type: AnalyticsEventType;
  galleryId?: string;
  proposalId?: string;
  shootId?: string;
  photoId?: string;
  meta?: Record<string, string | number | boolean>;
}) {
  await updateDb((db) => {
    db.analyticsEvents.push({
      id: nanoid(),
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
