import { randomUUID } from "crypto";
import { assertFirebaseReady } from "@/lib/db/require-firebase";
import { mediaProxyUrl } from "@/lib/storage/paths";
import type { MediaStore, PutMediaResult, SignedDownloadOpts } from "@/lib/storage/types";

/**
 * Legacy Firebase Storage backend.
 * Writes are retired in production (AURA-360) — R2 is primary.
 * Kept for optional dual-read / dual-delete until MEDIA_DUAL_READ=0.
 */
export function createFirebaseMediaStore(): MediaStore {
  return {
    backend: "firebase",

    async put(opts): Promise<PutMediaResult> {
      const { storage, bucketName } = assertFirebaseReady();
      const bucket = storage.bucket(bucketName);
      const file = bucket.file(opts.objectPath);
      const token = randomUUID();
      const makePublic = opts.acl === "public";
      try {
        await file.save(opts.buffer, {
          resumable: false,
          metadata: {
            contentType: opts.contentType,
            metadata: makePublic
              ? { firebaseStorageDownloadTokens: token }
              : {},
            cacheControl: makePublic
              ? "public, max-age=31536000, immutable"
              : "private, max-age=0",
          },
        });
      } catch (e) {
        const detail = e instanceof Error ? e.message : "upload failed";
        throw new Error(
          `Storage upload failed (${bucketName}/${opts.objectPath}): ${detail}. ` +
            "Ensure App Hosting compute SA has roles/storage.objectAdmin on the bucket.",
        );
      }

      if (makePublic) {
        try {
          await file.makePublic();
        } catch {
          // Token URL still works if makePublic is blocked by org policy
        }
        const encoded = encodeURIComponent(opts.objectPath);
        return {
          path: opts.objectPath,
          url: `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encoded}?alt=media&token=${token}`,
          backend: "firebase",
        };
      }

      return {
        path: opts.objectPath,
        url: mediaProxyUrl(opts.objectPath),
        backend: "firebase",
      };
    },

    async getBuffer(objectPath) {
      const { storage, bucketName } = assertFirebaseReady();
      const [buf] = await storage.bucket(bucketName).file(objectPath).download();
      return buf;
    },

    async delete(objectPath) {
      const { storage, bucketName } = assertFirebaseReady();
      await storage
        .bucket(bucketName)
        .file(objectPath)
        .delete({ ignoreNotFound: true });
    },

    async getSignedDownloadUrl(objectPath, opts?: SignedDownloadOpts) {
      void opts;
      // Prefer same-origin proxy until Firebase is retired for media.
      return mediaProxyUrl(objectPath);
    },
  };
}
