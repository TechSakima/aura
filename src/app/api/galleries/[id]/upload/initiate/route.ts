import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { requireAdmin } from "@/lib/auth";
import { readStudioDb } from "@/lib/db/store";
import { isR2Configured } from "@/lib/storage/r2-store";
import {
  createR2MultipartUpload,
  presignR2Put,
  presignR2UploadPart,
} from "@/lib/storage/r2-upload";
import { storageObjectPath } from "@/lib/storage/paths";

export const runtime = "nodejs";
export const maxDuration = 60;

const MULTIPART_THRESHOLD_BYTES = 32 * 1024 * 1024;
const MULTIPART_PART_BYTES = 32 * 1024 * 1024;
const MAX_MULTIPART_PARTS = 10_000;

function safeExt(filename: string): string {
  const m = /\.([a-z0-9]{1,8})$/i.exec(filename);
  return m?.[1]?.toLowerCase() || "bin";
}

/** POST — initiate direct upload (presigned PUT or S3 multipart) for a gallery file. */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isR2Configured()) {
    return NextResponse.json(
      { error: "Direct upload requires Cloudflare R2 (R2_*)." },
      { status: 503 },
    );
  }

  const { id: galleryId } = await ctx.params;
  const body = await req.json().catch(() => null);
  const filename = String(body?.filename || "upload.bin").slice(0, 500);
  const size = Number(body?.size || 0);
  const contentType = String(body?.contentType || "application/octet-stream");
  const kind =
    body?.kind === "video" ? "video" : body?.kind === "peek" ? "peek" : "main";

  if (!size || size < 1) {
    return NextResponse.json({ error: "size required" }, { status: 400 });
  }

  const db = await readStudioDb(admin.studioId);
  const gallery = db.galleries.find((g) => g.id === galleryId);
  if (!gallery) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const photoId = nanoid();
  const ext = safeExt(filename);
  const folder = kind === "video" ? "videos" : "originals";
  const objectPath = storageObjectPath(
    admin.studioId,
    "galleries",
    galleryId,
    folder,
    `${photoId}.${ext}`,
  );

  const multipart =
    size >= MULTIPART_THRESHOLD_BYTES || body?.multipart === true;

  if (!multipart) {
    const { url } = await presignR2Put({
      objectPath,
      contentType,
    });
    return NextResponse.json({
      mode: "presigned",
      photoId,
      objectPath,
      url,
      contentType,
      kind,
      originalFilename: filename,
      expiresInSec: 60 * 60 * 2,
    });
  }

  const partCount = Math.ceil(size / MULTIPART_PART_BYTES);
  if (partCount > MAX_MULTIPART_PARTS) {
    return NextResponse.json(
      { error: "File too large for multipart upload" },
      { status: 400 },
    );
  }

  const { uploadId } = await createR2MultipartUpload({
    objectPath,
    contentType,
  });

  return NextResponse.json({
    mode: "multipart",
    photoId,
    objectPath,
    uploadId,
    partSizeBytes: MULTIPART_PART_BYTES,
    partCount,
    contentType,
    kind,
    originalFilename: filename,
  });
}
