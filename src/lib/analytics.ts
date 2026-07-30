import { nanoid } from "nanoid";
import { COL } from "@/lib/db/collections";
import { appendStudioDoc } from "@/lib/db/store";
import { linkedSessionId } from "@/lib/linked-session";
import type { AnalyticsEvent, AnalyticsEventType } from "@/lib/types";

export { analyticsEventLabel } from "@/lib/analytics-labels";
export { linkedSessionId } from "@/lib/linked-session";

/** Append-only analytics write — never full-studio RMW (AURA-003). */
export async function recordEvent(input: {
  type: AnalyticsEventType;
  studioId?: string;
  galleryId?: string;
  proposalId?: string;
  projectId?: string;
  sessionId?: string;
  /** @deprecated prefer sessionId — accepted for callers, not persisted (AURA-116) */
  shootId?: string;
  photoId?: string;
  meta?: Record<string, string | number | boolean>;
}) {
  if (!input.studioId) return;
  const sessionId = linkedSessionId(input);
  const event: AnalyticsEvent = {
    id: nanoid(),
    studioId: input.studioId,
    type: input.type,
    galleryId: input.galleryId,
    proposalId: input.proposalId,
    projectId: input.projectId,
    sessionId,
    photoId: input.photoId,
    meta: input.meta,
    at: new Date().toISOString(),
  };
  await appendStudioDoc(COL.analyticsEvents, {
    ...event,
    studioId: input.studioId,
  });
}
