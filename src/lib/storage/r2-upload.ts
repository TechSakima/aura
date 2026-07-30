import "server-only";

import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  PutObjectCommand,
  S3Client,
  UploadPartCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { readR2Config } from "@/lib/storage/r2-store";

const PRESIGN_TTL_SEC = 60 * 60 * 2;

export const MULTIPART_MIN_PART_BYTES = 5 * 1024 * 1024;
export const DIRECT_UPLOAD_MULTIPART_THRESHOLD_BYTES = 32 * 1024 * 1024;

export function createR2UploadClient(): { client: S3Client; bucket: string } {
  const cfg = readR2Config();
  if (!cfg) {
    throw new Error("R2 is not configured (missing R2_* env vars).");
  }
  const client = new S3Client({
    region: "auto",
    endpoint: `https://${cfg.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: cfg.accessKeyId,
      secretAccessKey: cfg.secretAccessKey,
    },
  });
  return { client, bucket: cfg.bucket };
}

/** Single presigned PUT (files under multipart threshold). */
export async function presignR2Put(opts: {
  objectPath: string;
  contentType: string;
}): Promise<{ url: string; objectPath: string }> {
  const { client, bucket } = createR2UploadClient();
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: opts.objectPath,
    ContentType: opts.contentType,
  });
  const url = await getSignedUrl(client, command, {
    expiresIn: PRESIGN_TTL_SEC,
  });
  return { url, objectPath: opts.objectPath };
}

/** Create multipart upload. */
export async function createR2MultipartUpload(opts: {
  objectPath: string;
  contentType: string;
}): Promise<{ uploadId: string; objectPath: string }> {
  const { client, bucket } = createR2UploadClient();
  const res = await client.send(
    new CreateMultipartUploadCommand({
      Bucket: bucket,
      Key: opts.objectPath,
      ContentType: opts.contentType,
    }),
  );
  if (!res.UploadId) {
    throw new Error("R2 did not return UploadId");
  }
  return { uploadId: res.UploadId, objectPath: opts.objectPath };
}

/** Presign one multipart part. */
export async function presignR2UploadPart(opts: {
  objectPath: string;
  uploadId: string;
  partNumber: number;
}): Promise<string> {
  const { client, bucket } = createR2UploadClient();
  const command = new UploadPartCommand({
    Bucket: bucket,
    Key: opts.objectPath,
    UploadId: opts.uploadId,
    PartNumber: opts.partNumber,
  });
  return getSignedUrl(client, command, { expiresIn: PRESIGN_TTL_SEC });
}

/** Complete multipart after all parts uploaded. */
export async function completeR2MultipartUpload(opts: {
  objectPath: string;
  uploadId: string;
  parts: { partNumber: number; eTag: string }[];
}): Promise<void> {
  const { client, bucket } = createR2UploadClient();
  await client.send(
    new CompleteMultipartUploadCommand({
      Bucket: bucket,
      Key: opts.objectPath,
      UploadId: opts.uploadId,
      MultipartUpload: {
        Parts: opts.parts
          .slice()
          .sort((a, b) => a.partNumber - b.partNumber)
          .map((p) => ({ PartNumber: p.partNumber, ETag: p.eTag })),
      },
    }),
  );
}

export async function abortR2MultipartUpload(opts: {
  objectPath: string;
  uploadId: string;
}): Promise<void> {
  const { client, bucket } = createR2UploadClient();
  await client.send(
    new AbortMultipartUploadCommand({
      Bucket: bucket,
      Key: opts.objectPath,
      UploadId: opts.uploadId,
    }),
  );
}
