import { nanoid } from "nanoid";
import { COL } from "@/lib/db/collections";
import { appendStudioDoc } from "@/lib/db/store";
import type { AnalyticsEvent, AnalyticsEventType } from "@/lib/types";

export { analyticsEventLabel } from "@/lib/analytics-labels";

/** Append-only analytics write — never full-studio RMW (AURA-003). */
export async function recordEvent(input: {
  type: AnalyticsEventType;
  studioId?: string;
  galleryId?: string;
  proposalId?: string;
  projectId?: string;
  sessionId?: string;
  /** @deprecated prefer sessionId */
  shootId?: string;
  photoId?: string;
  meta?: Record<string, string | number | boolean>;
}) {
  if (!input.studioId) return;
  const event: AnalyticsEvent = {
    id: nanoid(),
    studioId: input.studioId,
    type: input.type,
    galleryId: input.galleryId,
    proposalId: input.proposalId,
    projectId: input.projectId,
    sessionId: input.sessionId || input.shootId,
    shootId: input.shootId,
    photoId: input.photoId,
    meta: input.meta,
    at: new Date().toISOString(),
  };
  await appendStudioDoc(COL.analyticsEvents, {
    ...event,
    studioId: input.studioId,
  });
}
