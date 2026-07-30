import { createFirebaseMediaStore } from "@/lib/storage/firebase-store";
import { createR2MediaStore, isR2Configured, readR2Config } from "@/lib/storage/r2-store";
import type { MediaBackend, MediaStore } from "@/lib/storage/types";

let cached: MediaStore | null = null;

function isNotFoundError(e: unknown): boolean {
  if (!e || typeof e !== "object") return false;
  const err = e as { name?: string; Code?: string; $metadata?: { httpStatusCode?: number } };
  if (err.name === "NoSuchKey" || err.name === "NotFound") return true;
  if (err.Code === "NoSuchKey") return true;
  if (err.$metadata?.httpStatusCode === 404) return true;
  const msg = e instanceof Error ? e.message : "";
  return /no such key|not found|404/i.test(msg);
}

/** App Hosting / Cloud Run / production — R2 writes required (AURA-360). */
export function isProductionMediaRuntime(): boolean {
  return Boolean(
    process.env.K_SERVICE ||
      process.env.FIREBASE_CONFIG ||
      process.env.NODE_ENV === "production",
  );
}

/**
 * Dual-read Firebase after R2 miss. Default on until explicitly disabled.
 * Set MEDIA_DUAL_READ=0 after cutover is solid.
 */
export function mediaDualReadEnabled(): boolean {
  const v = process.env.MEDIA_DUAL_READ?.trim().toLowerCase();
  if (v === "0" || v === "false" || v === "off") return false;
  return true;
}

export class MediaBackendNotConfiguredError extends Error {
  constructor(
    message = "Cloudflare R2 is required for media uploads. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET.",
  ) {
    super(message);
    this.name = "MediaBackendNotConfiguredError";
  }
}

/**
 * Primary store for new writes (AURA-360).
 * - R2 when configured
 * - Production: R2 required (no Firebase Storage writes)
 * - Local only: Firebase fallback if R2 unset
 */
export function getWriteMediaStore(): MediaStore {
  if (cached) return cached;
  const cfg = readR2Config();
  if (cfg) {
    cached = createR2MediaStore(cfg);
    return cached;
  }
  if (isProductionMediaRuntime()) {
    throw new MediaBackendNotConfiguredError();
  }
  cached = createFirebaseMediaStore();
  return cached;
}

export function mediaWriteBackend(): MediaBackend {
  return isR2Configured() ? "r2" : "firebase";
}

/** Alias used by status / ops — same as write backend after cutover. */
export function mediaBackend(): MediaBackend {
  return mediaWriteBackend();
}

/**
 * Read: R2 first when configured; optional Firebase dual-read for leftovers.
 */
export async function getMediaBuffer(objectPath: string): Promise<Buffer> {
  if (isR2Configured()) {
    try {
      return await createR2MediaStore().getBuffer(objectPath);
    } catch (e) {
      if (!isNotFoundError(e)) throw e;
      if (!mediaDualReadEnabled()) throw e;
    }
  } else if (isProductionMediaRuntime()) {
    throw new MediaBackendNotConfiguredError();
  }
  return createFirebaseMediaStore().getBuffer(objectPath);
}

/**
 * Delete from R2 (primary). Dual-delete Firebase when dual-read is on so cutover leaves no orphans.
 */
export async function deleteMediaObject(objectPath: string): Promise<void> {
  const tasks: Promise<void>[] = [];
  if (isR2Configured()) {
    tasks.push(createR2MediaStore().delete(objectPath).catch(() => undefined));
  }
  if (mediaDualReadEnabled() || !isR2Configured()) {
    tasks.push(createFirebaseMediaStore().delete(objectPath).catch(() => undefined));
  }
  await Promise.all(tasks);
}

export async function getSignedMediaDownloadUrl(
  objectPath: string,
  opts?: { expiresInSec?: number; filename?: string },
): Promise<string> {
  if (isR2Configured()) {
    try {
      return await createR2MediaStore().getSignedDownloadUrl(objectPath, opts);
    } catch (e) {
      if (!isNotFoundError(e)) throw e;
      if (!mediaDualReadEnabled()) throw e;
    }
  } else if (isProductionMediaRuntime()) {
    throw new MediaBackendNotConfiguredError();
  }
  return createFirebaseMediaStore().getSignedDownloadUrl(objectPath, opts);
}

/** Test helper — clear singleton between env changes. */
export function resetMediaStoreCache(): void {
  cached = null;
}
