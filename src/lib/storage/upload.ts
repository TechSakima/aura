import { randomUUID } from "crypto";
import { assertFirebaseReady } from "@/lib/db/require-firebase";

function projectPrefix() {
  return (
    process.env.FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    "aura"
  );
}

export function storageObjectPath(
  ...parts: string[]
): string {
  return ["studios", projectPrefix(), ...parts]
    .map((p) => p.replace(/^\/+|\/+$/g, ""))
    .join("/");
}

export async function uploadBuffer(opts: {
  buffer: Buffer;
  objectPath: string;
  contentType: string;
  /** When true, object is publicly readable (derivatives). Originals stay private. */
  makePublic?: boolean;
}): Promise<{ path: string; url: string }> {
  const { storage, bucketName } = assertFirebaseReady();
  const bucket = storage.bucket(bucketName);
  const file = bucket.file(opts.objectPath);
  const token = randomUUID();
  try {
    await file.save(opts.buffer, {
      resumable: false,
      metadata: {
        contentType: opts.contentType,
        metadata: opts.makePublic
          ? { firebaseStorageDownloadTokens: token }
          : {},
        cacheControl: opts.makePublic
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

  if (opts.makePublic) {
    try {
      await file.makePublic();
    } catch {
      // Token URL still works if makePublic is blocked by org policy
    }
    const encoded = encodeURIComponent(opts.objectPath);
    const url = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encoded}?alt=media&token=${token}`;
    return { path: opts.objectPath, url };
  }

  // Private: serve through our media proxy (same-origin on App Hosting / Hosting)
  return {
    path: opts.objectPath,
    url: `/api/media/${opts.objectPath.split("/").map(encodeURIComponent).join("/")}`,
  };
}

export async function downloadStorageBuffer(objectPath: string): Promise<Buffer> {
  const { storage, bucketName } = assertFirebaseReady();
  const [buf] = await storage.bucket(bucketName).file(objectPath).download();
  return buf;
}

export async function deleteStorageObject(objectPath: string): Promise<void> {
  const { storage, bucketName } = assertFirebaseReady();
  await storage
    .bucket(bucketName)
    .file(objectPath)
    .delete({ ignoreNotFound: true });
}
