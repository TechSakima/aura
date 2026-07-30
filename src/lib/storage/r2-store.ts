import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { mediaProxyUrl } from "@/lib/storage/paths";
import type { MediaStore, PutMediaResult, SignedDownloadOpts } from "@/lib/storage/types";

export type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
};

export function readR2Config(): R2Config | null {
  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
  const bucket = process.env.R2_BUCKET?.trim();
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) return null;
  return { accountId, accessKeyId, secretAccessKey, bucket };
}

export function isR2Configured(): boolean {
  return readR2Config() !== null;
}

function createS3Client(cfg: R2Config): S3Client {
  return new S3Client({
    region: "auto",
    endpoint: `https://${cfg.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: cfg.accessKeyId,
      secretAccessKey: cfg.secretAccessKey,
    },
  });
}

async function streamToBuffer(
  body: ReadableStream | NodeJS.ReadableStream | Blob | undefined,
): Promise<Buffer> {
  if (!body) return Buffer.alloc(0);
  if (body instanceof Blob) {
    return Buffer.from(await body.arrayBuffer());
  }
  const chunks: Buffer[] = [];
  for await (const chunk of body as AsyncIterable<Uint8Array | Buffer>) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export function createR2MediaStore(cfg: R2Config = readR2Config()!): MediaStore {
  if (!cfg) {
    throw new Error("R2 is not configured (missing R2_* env vars).");
  }
  const client = createS3Client(cfg);
  const bucket = cfg.bucket;

  return {
    backend: "r2",

    async put(opts): Promise<PutMediaResult> {
      const makePublic = opts.acl === "public";
      try {
        await client.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: opts.objectPath,
            Body: opts.buffer,
            ContentType: opts.contentType,
            CacheControl: makePublic
              ? "public, max-age=31536000, immutable"
              : "private, max-age=0",
          }),
        );
      } catch (e) {
        const detail = e instanceof Error ? e.message : "upload failed";
        throw new Error(
          `R2 upload failed (${bucket}/${opts.objectPath}): ${detail}`,
        );
      }

      // Browse URLs are re-signed at read time (AURA-357); store stable proxy path.
      return {
        path: opts.objectPath,
        url: mediaProxyUrl(opts.objectPath),
        backend: "r2",
      };
    },

    async getBuffer(objectPath) {
      const res = await client.send(
        new GetObjectCommand({ Bucket: bucket, Key: objectPath }),
      );
      return streamToBuffer(res.Body as never);
    },

    async delete(objectPath) {
      await client.send(
        new DeleteObjectCommand({ Bucket: bucket, Key: objectPath }),
      );
    },

    async getSignedDownloadUrl(objectPath, opts?: SignedDownloadOpts) {
      const expiresIn = opts?.expiresInSec ?? 60 * 15;
      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: objectPath,
        ...(opts?.filename
          ? {
              ResponseContentDisposition: `attachment; filename="${opts.filename.replace(/"/g, "")}"`,
            }
          : {}),
      });
      return getSignedUrl(client, command, { expiresIn });
    },
  };
}
