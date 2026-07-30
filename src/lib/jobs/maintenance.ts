import { deleteExpiredAuthSessions } from "@/lib/db/store";
import { drainEmailOutbox } from "@/lib/email-outbox";
import { compactAnalyticsEvents } from "@/lib/jobs/compact-analytics";
import { expireDueGalleries } from "@/lib/jobs/expire-galleries";

/**
 * Shared cron maintenance (AURA-112 / AURA-117).
 * Email outbox + auth purge + gallery expiry + analytics retention.
 * Watermark reprocess stays off this path (AURA-387).
 */
export async function runMaintenanceJobs(opts?: {
  emailLimit?: number;
  authSessionLimit?: number;
  galleryExpireLimit?: number;
  analyticsAgeLimit?: number;
  analyticsStudiosPerRun?: number;
}) {
  const email = await drainEmailOutbox({
    limit: opts?.emailLimit ?? 20,
  });
  const authSessionsDeleted = await deleteExpiredAuthSessions(
    opts?.authSessionLimit ?? 50,
  ).catch(() => 0);
  const galleries = await expireDueGalleries(
    opts?.galleryExpireLimit ?? 40,
  ).catch(() => ({ expired: 0, scanned: 0 }));
  const analytics = await compactAnalyticsEvents({
    ageDeleteLimit: opts?.analyticsAgeLimit,
    studiosPerRun: opts?.analyticsStudiosPerRun,
  }).catch(() => ({
    agedDeleted: 0,
    capDeleted: 0,
    studiosCapped: 0,
    cutoff: "",
  }));

  return {
    ...email,
    authSessionsDeleted,
    galleriesExpired: galleries.expired,
    galleriesScanned: galleries.scanned,
    analyticsAgedDeleted: analytics.agedDeleted,
    analyticsCapDeleted: analytics.capDeleted,
    analyticsStudiosCapped: analytics.studiosCapped,
  };
}
