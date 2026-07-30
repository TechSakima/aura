import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { requireAdmin } from "@/lib/auth";
import {
  appendStudioPhotos,
  readStudioDb,
} from "@/lib/db/store";
import { isR2Configured } from "@/lib/storage/r2-store";
import {
  abortR2MultipartUpload,
  completeR2MultipartUpload,
} from "@/lib/storage/r2-upload";
import { mediaProxyUrl } from "@/lib/storage/paths";
import type { Photo } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

/** POST — finalize direct upload (multipart complete + Photo row).
 * Photos: Sharp derivatives from the uploaded original (R2) when Sharp is available.
 * Videos: no server processing — register original object only.
 */
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
  const mode = body?.mode === "multipart" ? "multipart" : "presigned";
  const objectPath = String(body?.objectPath || "");
  const photoId = String(body?.photoId || nanoid());
  const kind =
    body?.kind === "video" ? "video" : body?.kind === "peek" ? "peek" : "main";
  const originalFilename = body?.originalFilename
    ? String(body.originalFilename).slice(0, 500)
    : undefined;
  const contentType = String(body?.contentType || "application/octet-stream");
  const uploadId = body?.uploadId ? String(body.uploadId) : "";
  const parts = Array.isArray(body?.parts) ? body.parts : [];

  if (!objectPath.startsWith(`studios/${admin.studioId}/`)) {
    return NextResponse.json({ error: "Invalid objectPath" }, { status: 400 });
  }

  const db = await readStudioDb(admin.studioId);
  const gallery = db.galleries.find((g) => g.id === galleryId);
  if (!gallery) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (mode === "multipart") {
    if (!uploadId) {
      return NextResponse.json({ error: "uploadId required" }, { status: 400 });
    }
    const normalizedParts: { partNumber: number; eTag: string }[] = [];
    for (const p of parts as unknown[]) {
      const row = p as { partNumber?: number; eTag?: string };
      const partNumber = Number(row.partNumber);
      const eTag = String(row.eTag || "");
      if (partNumber >= 1 && eTag) {
        normalizedParts.push({ partNumber, eTag });
      }
    }
    try {
      await completeR2MultipartUpload({
        objectPath,
        uploadId,
        parts: normalizedParts,
      });
    } catch (e) {
      await abortR2MultipartUpload({ objectPath, uploadId }).catch(() => undefined);
      const message = e instanceof Error ? e.message : "Multipart complete failed";
      return NextResponse.json({ error: message }, { status: 502 });
    }
  }

  const now = new Date().toISOString();
  // Sharp runs before the write queue — never hold studio write lock during derivatives (AURA-267).
  const url = mediaProxyUrl(objectPath);
  let thumbUrl = url;
  let webUrl = url;
  let watermarkedUrl = url;
  let width: number | undefined = kind === "video" ? undefined : 1;
  let height: number | undefined = kind === "video" ? undefined : 1;
  let aspect: number | undefined = kind === "video" ? undefined : 1;

  if (kind !== "video") {
    try {
      const { processDerivativesFromOriginal } = await import(
        "@/lib/images/process"
      );
      const presetId =
        gallery.watermarkPresetId || db.studio.defaultWatermarkPresetId;
      const watermark = gallery.watermarkEnabled
        ? db.watermarkPresets.find((w) => w.id === presetId) || null
        : null;
      const deriv = await processDerivativesFromOriginal({
        storagePath: objectPath,
        baseId: photoId,
        watermark,
      });
      thumbUrl = deriv.thumbUrl;
      webUrl = deriv.webUrl;
      watermarkedUrl = deriv.watermarkedUrl;
      width = deriv.width;
      height = deriv.height;
      aspect = deriv.aspect;
    } catch (e) {
      console.error("[upload/complete] derivatives failed; using proxy urls", e);
      if (gallery.watermarkEnabled) {
        return NextResponse.json(
          {
            error:
              "Image engine unavailable — watermarks would be unprotected. Try again when Sharp is available.",
            code: "sharp_unavailable",
          },
          { status: 503 },
        );
      }
    }
  }

  const photo: Photo = {
    id: photoId,
    studioId: admin.studioId,
    galleryId,
    kind: kind as Photo["kind"],
    storagePath: objectPath,
    originalFilename,
    thumbUrl: kind === "video" ? gallery.coverPhotoUrl || thumbUrl : thumbUrl,
    webUrl,
    watermarkedUrl,
    videoUrl: kind === "video" ? url : undefined,
    mimeType: contentType,
    sortOrder: 0, // assigned inside appendStudioPhotos write lock
    aspect: aspect ?? 1,
    version: 1,
    width: width ?? 1,
    height: height ?? 1,
    createdAt: now,
    updatedAt: now,
  };

  await appendStudioPhotos(admin.studioId, [photo], {
    galleryId,
    coverPhotoUrl: kind !== "video" ? photo.watermarkedUrl : undefined,
    assignSortOrders: true,
  });

  return NextResponse.json({ photo, ok: true });
}
