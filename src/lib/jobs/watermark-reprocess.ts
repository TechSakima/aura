import { nanoid } from "nanoid";
import { COL } from "@/lib/db/collections";
import { assertFirebaseReady, firebaseReady } from "@/lib/db/require-firebase";
import {
  appendStudioDoc,
  ensureMigrated,
  getGalleryById,
  getStudioDoc,
  listPhotosByGalleryId,
  patchStudioDoc,
} from "@/lib/db/store";
import { reprocessWatermarkedDerivative } from "@/lib/images/process";
import { resolveWatermarkForGallery } from "@/lib/images/rewatermark";
import type {
  WatermarkPreset,
  WatermarkReprocessJob,
} from "@/lib/types";

const BACKOFF_MS = [30_000, 2 * 60_000, 10 * 60_000, 60 * 60_000] as const;
const MAX_ATTEMPTS = BACKOFF_MS.length;
/** Photos per cron slice — keep under request/cron time budgets. */
const PHOTOS_PER_SLICE = 16;
const CONCURRENCY = 4;

async function listWatermarkPresets(
  studioId: string,
): Promise<WatermarkPreset[]> {
  const { db } = assertFirebaseReady();
  const snap = await db
    .collection(COL.watermarkPresets)
    .where("studioId", "==", studioId)
    .get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as WatermarkPreset);
}

async function findOpenJob(
  studioId: string,
  galleryId: string,
): Promise<WatermarkReprocessJob | null> {
  const { db } = assertFirebaseReady();
  try {
    const snap = await db
      .collection(COL.watermarkJobs)
      .where("studioId", "==", studioId)
      .where("galleryId", "==", galleryId)
      .where("status", "in", ["pending", "running"])
      .limit(5)
      .get();
    if (snap.empty) return null;
    const jobs = snap.docs.map(
      (d) => ({ id: d.id, ...d.data() }) as WatermarkReprocessJob,
    );
    return (
      jobs.find((j) => j.status === "pending") ||
      jobs.find((j) => j.status === "running") ||
      null
    );
  } catch {
    // Fallback if composite/`in` index missing
    const snap = await db
      .collection(COL.watermarkJobs)
      .where("studioId", "==", studioId)
      .where("galleryId", "==", galleryId)
      .limit(20)
      .get();
    const jobs = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }) as WatermarkReprocessJob)
      .filter((j) => j.status === "pending" || j.status === "running");
    return (
      jobs.find((j) => j.status === "pending") ||
      jobs.find((j) => j.status === "running") ||
      null
    );
  }
}

/** Queue gallery rewatermark — no image I/O, no full-studio RMW (AURA-387). */
export async function enqueueWatermarkReprocess(opts: {
  studioId: string;
  galleryId: string;
}): Promise<{ job: WatermarkReprocessJob; alreadyQueued: boolean }> {
  await ensureMigrated();
  const now = new Date().toISOString();
  const existing = await findOpenJob(opts.studioId, opts.galleryId);
  if (existing) {
    await patchStudioDoc(COL.watermarkJobs, existing.id, {
      status: "pending",
      cursor: 0,
      updated: 0,
      errors: 0,
      attempts: existing.attempts,
      nextAttemptAt: now,
      lastError: undefined,
    });
    return {
      job: {
        ...existing,
        status: "pending",
        cursor: 0,
        updated: 0,
        errors: 0,
        nextAttemptAt: now,
        updatedAt: now,
      },
      alreadyQueued: true,
    };
  }

  const job: WatermarkReprocessJob = {
    id: nanoid(),
    studioId: opts.studioId,
    galleryId: opts.galleryId,
    status: "pending",
    attempts: 0,
    nextAttemptAt: now,
    cursor: 0,
    updated: 0,
    errors: 0,
    createdAt: now,
    updatedAt: now,
  };
  await appendStudioDoc(COL.watermarkJobs, job);
  return { job, alreadyQueued: false };
}

/** Enqueue one job per gallery id (deduped). */
export async function enqueueWatermarkReprocessMany(opts: {
  studioId: string;
  galleryIds: string[];
}): Promise<{ queued: number }> {
  const unique = [...new Set(opts.galleryIds.filter(Boolean))];
  let queued = 0;
  for (const galleryId of unique) {
    await enqueueWatermarkReprocess({
      studioId: opts.studioId,
      galleryId,
    });
    queued += 1;
  }
  return { queued };
}

async function processJobSlice(
  job: WatermarkReprocessJob,
): Promise<"done" | "continue" | "dead"> {
  const gallery = await getGalleryById(job.galleryId);
  if (!gallery || gallery.studioId !== job.studioId) {
    await patchStudioDoc(COL.watermarkJobs, job.id, {
      status: "dead",
      lastError: "Gallery missing",
      attempts: job.attempts + 1,
    });
    return "dead";
  }

  const [studio, presets, photos] = await Promise.all([
    getStudioDoc(job.studioId),
    listWatermarkPresets(job.studioId),
    listPhotosByGalleryId(job.galleryId),
  ]);
  if (!studio) {
    await patchStudioDoc(COL.watermarkJobs, job.id, {
      status: "dead",
      lastError: "Studio missing",
      attempts: job.attempts + 1,
    });
    return "dead";
  }

  const watermark = resolveWatermarkForGallery(gallery, studio, presets);
  const stillImages = photos.filter((p) => p.kind !== "video");
  const start = Math.max(0, job.cursor || 0);
  const slice = stillImages.slice(start, start + PHOTOS_PER_SLICE);

  let updated = job.updated || 0;
  let errors = job.errors || 0;

  for (let i = 0; i < slice.length; i += CONCURRENCY) {
    const batch = slice.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map(async (photo) => {
        try {
          const { watermarkedUrl } = await reprocessWatermarkedDerivative({
            storagePath: photo.storagePath,
            watermark,
          });
          await patchStudioDoc(COL.photos, photo.id, {
            watermarkedUrl,
            version: (photo.version || 0) + 1,
          });
          updated += 1;
        } catch (err) {
          errors += 1;
          console.error(
            "[watermark-job] photo failed",
            photo.id,
            err instanceof Error ? err.message : err,
          );
        }
      }),
    );
  }

  const nextCursor = start + slice.length;
  if (nextCursor >= stillImages.length) {
    await patchStudioDoc(COL.watermarkJobs, job.id, {
      status: "done",
      cursor: nextCursor,
      updated,
      errors,
      lastError: errors ? `${errors} photo error(s)` : undefined,
    });
    return "done";
  }

  await patchStudioDoc(COL.watermarkJobs, job.id, {
    status: "pending",
    cursor: nextCursor,
    updated,
    errors,
    nextAttemptAt: new Date().toISOString(),
  });
  return "continue";
}

/**
 * Drain due watermark jobs. O(jobs × photos/slice) — no full-studio RMW.
 */
export async function drainWatermarkJobs(opts?: {
  limit?: number;
}): Promise<{ processed: number; done: number; continued: number; dead: number }> {
  if (!firebaseReady()) {
    return { processed: 0, done: 0, continued: 0, dead: 0 };
  }

  const limit = Math.max(1, Math.min(opts?.limit ?? 4, 20));
  await ensureMigrated();
  const { db } = assertFirebaseReady();

  let candidates: WatermarkReprocessJob[] = [];
  try {
    const snap = await db
      .collection(COL.watermarkJobs)
      .where("status", "==", "pending")
      .limit(40)
      .get();
    const now = Date.now();
    candidates = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }) as WatermarkReprocessJob)
      .filter((j) => {
        const t = new Date(j.nextAttemptAt).getTime();
        return Number.isFinite(t) && t <= now;
      })
      .sort((a, b) => a.nextAttemptAt.localeCompare(b.nextAttemptAt))
      .slice(0, limit);
  } catch (err) {
    console.error("[watermark-job] list pending failed", err);
    return { processed: 0, done: 0, continued: 0, dead: 0 };
  }

  let done = 0;
  let continued = 0;
  let dead = 0;

  for (const job of candidates) {
    const attempts = (job.attempts || 0) + 1;
    try {
      await patchStudioDoc(COL.watermarkJobs, job.id, {
        status: "running",
        attempts,
      });
      const result = await processJobSlice({ ...job, attempts });
      if (result === "done") done += 1;
      else if (result === "continue") continued += 1;
      else dead += 1;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Watermark job failed";
      console.error("[watermark-job] slice failed", job.id, err);
      if (attempts >= MAX_ATTEMPTS) {
        await patchStudioDoc(COL.watermarkJobs, job.id, {
          status: "dead",
          attempts,
          lastError: msg,
        });
        dead += 1;
      } else {
        const delay =
          BACKOFF_MS[Math.min(attempts - 1, BACKOFF_MS.length - 1)]!;
        await patchStudioDoc(COL.watermarkJobs, job.id, {
          status: "pending",
          attempts,
          lastError: msg,
          nextAttemptAt: new Date(Date.now() + delay).toISOString(),
        });
      }
    }
  }

  return {
    processed: candidates.length,
    done,
    continued,
    dead,
  };
}
