import { COL } from "@/lib/db/collections";
import { assertFirebaseReady, firebaseReady } from "@/lib/db/require-firebase";
import { deleteStudioDocs } from "@/lib/db/store";

/** Default keep window for raw analytics events (AURA-117). */
export const ANALYTICS_RETENTION_DAYS_DEFAULT = 180;
/** Soft per-studio ceiling after age prune (admin still loads remaining rows). */
export const ANALYTICS_MAX_PER_STUDIO_DEFAULT = 8_000;

export function analyticsRetentionCutoff(
  now: Date,
  retentionDays: number,
): string {
  const days = Math.min(Math.max(Math.floor(retentionDays), 7), 3650);
  return new Date(now.getTime() - days * 86_400_000).toISOString();
}

/** Rotate which studios get a cap pass so cron stays O(batch), not O(all). */
export function pickStudioIdsForCap(
  studioIds: string[],
  dayIndex: number,
  perRun: number,
): string[] {
  if (!studioIds.length || perRun <= 0) return [];
  const sorted = [...studioIds].sort();
  const n = sorted.length;
  const take = Math.min(perRun, n);
  const start = ((dayIndex % n) + n) % n;
  const out: string[] = [];
  for (let i = 0; i < take; i++) {
    out.push(sorted[(start + i) % n]!);
  }
  return out;
}

function retentionDaysFromEnv(): number {
  const raw = process.env.AURA_ANALYTICS_RETENTION_DAYS?.trim();
  if (!raw) return ANALYTICS_RETENTION_DAYS_DEFAULT;
  const n = Number(raw);
  return Number.isFinite(n) ? n : ANALYTICS_RETENTION_DAYS_DEFAULT;
}

function maxPerStudioFromEnv(): number {
  const raw = process.env.AURA_ANALYTICS_MAX_PER_STUDIO?.trim();
  if (!raw) return ANALYTICS_MAX_PER_STUDIO_DEFAULT;
  const n = Number(raw);
  return Number.isFinite(n) ? n : ANALYTICS_MAX_PER_STUDIO_DEFAULT;
}

/**
 * Bound analyticsEvents growth (AURA-117).
 * - Delete events older than retention (ISO `at` lexicographic ≤ works).
 * - Soft-cap a rotating slice of studios by deleting oldest rows.
 * Never `updateStudioDb` / full-studio RMW.
 */
export async function compactAnalyticsEvents(opts?: {
  retentionDays?: number;
  ageDeleteLimit?: number;
  maxPerStudio?: number;
  studioCapBatch?: number;
  studiosPerRun?: number;
  now?: Date;
}): Promise<{
  agedDeleted: number;
  capDeleted: number;
  studiosCapped: number;
  cutoff: string;
}> {
  const empty = {
    agedDeleted: 0,
    capDeleted: 0,
    studiosCapped: 0,
    cutoff: "",
  };
  if (!firebaseReady()) return empty;

  const now = opts?.now ?? new Date();
  const retentionDays = opts?.retentionDays ?? retentionDaysFromEnv();
  const cutoff = analyticsRetentionCutoff(now, retentionDays);
  const ageLimit = Math.min(Math.max(opts?.ageDeleteLimit ?? 100, 1), 200);
  const maxPerStudio = Math.min(
    Math.max(opts?.maxPerStudio ?? maxPerStudioFromEnv(), 500),
    50_000,
  );
  const studioCapBatch = Math.min(
    Math.max(opts?.studioCapBatch ?? 80, 1),
    200,
  );
  const studiosPerRun = Math.min(Math.max(opts?.studiosPerRun ?? 5, 1), 20);

  const { db } = assertFirebaseReady();

  let agedDeleted = 0;
  try {
    const agedSnap = await db
      .collection(COL.analyticsEvents)
      .where("at", "<=", cutoff)
      .limit(ageLimit)
      .get();
    if (!agedSnap.empty) {
      const byStudio = new Map<string, string[]>();
      for (const d of agedSnap.docs) {
        const studioId = String(d.data().studioId || "");
        const list = byStudio.get(studioId) || [];
        list.push(d.id);
        byStudio.set(studioId, list);
      }
      for (const [studioId, ids] of byStudio) {
        await deleteStudioDocs(COL.analyticsEvents, ids, {
          studioId: studioId || undefined,
        });
        agedDeleted += ids.length;
      }
    }
  } catch (err) {
    console.error("[jobs] analytics age prune", err);
  }

  let capDeleted = 0;
  let studiosCapped = 0;
  try {
    const studiosSnap = await db.collection(COL.studios).select().get();
    const studioIds = studiosSnap.docs.map((d) => d.id);
    const dayIndex = Math.floor(now.getTime() / 86_400_000);
    const slice = pickStudioIdsForCap(studioIds, dayIndex, studiosPerRun);

    for (const studioId of slice) {
      try {
        const countSnap = await db
          .collection(COL.analyticsEvents)
          .where("studioId", "==", studioId)
          .count()
          .get();
        const total = countSnap.data().count;
        if (total <= maxPerStudio) continue;

        const excess = Math.min(total - maxPerStudio, studioCapBatch);
        const oldest = await db
          .collection(COL.analyticsEvents)
          .where("studioId", "==", studioId)
          .orderBy("at", "asc")
          .limit(excess)
          .get();
        if (oldest.empty) continue;

        const ids = oldest.docs.map((d) => d.id);
        await deleteStudioDocs(COL.analyticsEvents, ids, { studioId });
        capDeleted += ids.length;
        studiosCapped += 1;
      } catch (err) {
        console.error("[jobs] analytics studio cap", studioId, err);
      }
    }
  } catch (err) {
    console.error("[jobs] analytics cap pass", err);
  }

  return { agedDeleted, capDeleted, studiosCapped, cutoff };
}
