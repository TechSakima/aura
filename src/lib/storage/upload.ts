import {
  deleteMediaObject,
  getMediaBuffer,
  getSignedMediaDownloadUrl,
  getWriteMediaStore,
  mediaWriteBackend,
} from "@/lib/storage/media-store";
import { mediaProxyUrl, storageObjectPath } from "@/lib/storage/paths";

export { storageObjectPath, mediaProxyUrl };
export { getSignedMediaDownloadUrl };

/** Tenant media: R2 when configured, else Firebase Storage. */
export async function uploadBuffer(opts: {
  buffer: Buffer;
  objectPath: string;
  contentType: string;
  /** When true, object is treated as a long-cache derivative (still proxied until AURA-357). */
  makePublic?: boolean;
}): Promise<{ path: string; url: string }> {
  const store = getWriteMediaStore();
  const result = await store.put({
    buffer: opts.buffer,
    objectPath: opts.objectPath,
    contentType: opts.contentType,
    acl: opts.makePublic ? "public" : "private",
  });
  return { path: result.path, url: result.url };
}

export async function downloadStorageBuffer(objectPath: string): Promise<Buffer> {
  return getMediaBuffer(objectPath);
}

export async function deleteStorageObject(objectPath: string): Promise<void> {
  await deleteMediaObject(objectPath);
}

export function activeMediaBackend(): "r2" | "firebase" {
  return mediaWriteBackend();
}
