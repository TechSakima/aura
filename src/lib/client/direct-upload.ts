"use client";

/**
 * Direct-to-R2 uploads (AURA-361): presigned PUT for small files, S3 multipart for large.
 * Timeouts + progress for AURA-267.
 */

export type DirectUploadInit =
  | {
      mode: "presigned";
      photoId: string;
      objectPath: string;
      url: string;
      contentType: string;
      kind: string;
      originalFilename: string;
      expiresInSec: number;
    }
  | {
      mode: "multipart";
      photoId: string;
      objectPath: string;
      uploadId: string;
      partSizeBytes: number;
      partCount: number;
      contentType: string;
      kind: string;
      originalFilename: string;
    };

const PART_SIGN_BATCH = 50;
/** Keep part workers modest when several files upload in parallel (AURA-267). */
const PART_UPLOAD_CONCURRENCY = 2;

const INIT_TIMEOUT_MS = 30_000;
const PUT_TIMEOUT_MS = 180_000;
const PART_PUT_TIMEOUT_MS = 120_000;
const COMPLETE_TIMEOUT_MS = 90_000;

export class UploadTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UploadTimeoutError";
  }
}

async function fetchWithTimeout(
  input: string,
  init: RequestInit | undefined,
  ms: number,
  timeoutMessage: string,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (err) {
    if (
      (err instanceof DOMException && err.name === "AbortError") ||
      (err instanceof Error && err.name === "AbortError")
    ) {
      throw new UploadTimeoutError(timeoutMessage);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

async function postJson(
  url: string,
  body: unknown,
  timeoutMs: number,
  timeoutMessage: string,
): Promise<Response> {
  return fetchWithTimeout(
    url,
    {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    timeoutMs,
    timeoutMessage,
  );
}

export async function initiateGalleryDirectUpload(
  galleryId: string,
  opts: {
    filename: string;
    size: number;
    contentType: string;
    kind: "main" | "peek" | "video";
  },
): Promise<DirectUploadInit> {
  const res = await postJson(
    `/api/galleries/${galleryId}/upload/initiate`,
    {
      filename: opts.filename,
      size: opts.size,
      contentType: opts.contentType,
      kind: opts.kind,
    },
    INIT_TIMEOUT_MS,
    "Upload timed out — try again",
  );
  const data = (await res.json()) as DirectUploadInit & { error?: string };
  if (!res.ok) {
    throw new Error(data.error || "Could not start upload");
  }
  return data;
}

async function signPartUrls(
  galleryId: string,
  objectPath: string,
  uploadId: string,
  partNumbers: number[],
): Promise<{ partNumber: number; url: string }[]> {
  const res = await postJson(
    `/api/galleries/${galleryId}/upload/parts`,
    {
      objectPath,
      uploadId,
      partNumbers,
    },
    INIT_TIMEOUT_MS,
    "Upload timed out — try again",
  );
  const data = (await res.json()) as {
    parts?: { partNumber: number; url: string }[];
    error?: string;
  };
  if (!res.ok || !data.parts) {
    throw new Error(data.error || "Could not sign upload parts");
  }
  return data.parts;
}

async function uploadParts(
  galleryId: string,
  init: Extract<DirectUploadInit, { mode: "multipart" }>,
  file: File,
  onProgress?: (uploadedBytes: number, totalBytes: number) => void,
): Promise<{ partNumber: number; eTag: string }[]> {
  const results: { partNumber: number; eTag: string }[] = [];
  let uploaded = 0;

  for (let start = 1; start <= init.partCount; start += PART_SIGN_BATCH) {
    const numbers: number[] = [];
    for (let i = 0; i < PART_SIGN_BATCH && start + i <= init.partCount; i++) {
      numbers.push(start + i);
    }
    const signed = await signPartUrls(
      galleryId,
      init.objectPath,
      init.uploadId,
      numbers,
    );
    const urlByPart = new Map(signed.map((s) => [s.partNumber, s.url]));

    let cursor = 0;
    async function worker() {
      while (cursor < numbers.length) {
        const partNumber = numbers[cursor++]!;
        const url = urlByPart.get(partNumber)!;
        const startByte = (partNumber - 1) * init.partSizeBytes;
        const endByte = Math.min(startByte + init.partSizeBytes, file.size);
        const blob = file.slice(startByte, endByte);

        const res = await fetchWithTimeout(
          url,
          {
            method: "PUT",
            body: blob,
            headers: {
              "Content-Type": "application/octet-stream",
            },
          },
          PART_PUT_TIMEOUT_MS,
          "Upload timed out — try again",
        );
        if (!res.ok) {
          throw new Error(`Part ${partNumber} upload failed (${res.status})`);
        }
        const eTag = res.headers.get("ETag")?.replace(/"/g, "");
        if (!eTag) {
          throw new Error(`Part ${partNumber} missing ETag`);
        }
        results.push({ partNumber, eTag });
        uploaded += blob.size;
        onProgress?.(uploaded, file.size);
      }
    }

    await Promise.all(
      Array.from(
        { length: Math.min(PART_UPLOAD_CONCURRENCY, numbers.length) },
        () => worker(),
      ),
    );
  }

  return results;
}

export async function completeGalleryDirectUpload(
  galleryId: string,
  payload: {
    mode: "presigned" | "multipart";
    objectPath: string;
    photoId: string;
    kind: string;
    contentType: string;
    originalFilename?: string;
    uploadId?: string;
    parts?: { partNumber: number; eTag: string }[];
  },
): Promise<unknown> {
  const res = await postJson(
    `/api/galleries/${galleryId}/upload/complete`,
    payload,
    COMPLETE_TIMEOUT_MS,
    "Processing timed out — try again",
  );
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) {
    if (res.status === 504 || res.status === 408) {
      throw new UploadTimeoutError("Processing timed out — try again");
    }
    throw new Error(data.error || "Could not finish upload");
  }
  return data;
}

/** One file end-to-end: initiate → upload to R2 → complete (Photo row). */
export async function uploadGalleryFileDirect(
  galleryId: string,
  file: File,
  kind: "main" | "peek" | "video",
  onProgress?: (uploadedBytes: number, totalBytes: number) => void,
): Promise<unknown> {
  const contentType = file.type || "application/octet-stream";
  const init = await initiateGalleryDirectUpload(galleryId, {
    filename: file.name,
    size: file.size,
    contentType,
    kind,
  });

  if (init.mode === "presigned") {
    const res = await fetchWithTimeout(
      init.url,
      {
        method: "PUT",
        body: file,
        headers: { "Content-Type": init.contentType },
      },
      PUT_TIMEOUT_MS,
      "Upload timed out — try again",
    );
    if (!res.ok) {
      throw new Error(`Upload failed (${res.status})`);
    }
    onProgress?.(file.size, file.size);
    return completeGalleryDirectUpload(galleryId, {
      mode: "presigned",
      objectPath: init.objectPath,
      photoId: init.photoId,
      kind,
      contentType,
      originalFilename: file.name,
    });
  }

  const parts = await uploadParts(galleryId, init, file, onProgress);
  return completeGalleryDirectUpload(galleryId, {
    mode: "multipart",
    objectPath: init.objectPath,
    photoId: init.photoId,
    kind,
    contentType,
    originalFilename: file.name,
    uploadId: init.uploadId,
    parts,
  });
}
