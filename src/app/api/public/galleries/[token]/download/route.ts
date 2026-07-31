import { NextResponse } from "next/server";
import {
  findGalleryByPublicToken,
  getPhotosByIds,
  listPhotosByGalleryId,
} from "@/lib/db/store";
import {
  downloadFilename,
} from "@/lib/images/download-filename";
import { verifyPin } from "@/lib/pin";
import { linkedSessionId, recordEvent } from "@/lib/analytics";
import { clientIp, rateLimitShared } from "@/lib/rate-limit";
import { getSignedMediaDownloadUrl } from "@/lib/storage/upload";
import {
  getVisitorFavorites,
  parseVisitorIdFromCookieHeader,
} from "@/lib/gallery-favorites";
import { assertPublicGalleryAccess } from "@/lib/public-access";
import type { Photo } from "@/lib/types";

const SIGNED_TTL_SEC = 60 * 15;

function isDownloadableKind(kind: string): boolean {
  return kind === "main" || kind === "peek" || kind === "video";
}

function bySortOrder(a: Photo, b: Photo): number {
  return a.sortOrder - b.sortOrder;
}

/** Original-extension from stored filename or storage path (not hardcoded jpg). */
function originalExtension(photo: Photo): string {
  const raw = photo.originalFilename?.trim() || photo.storagePath || "";
  const base = raw.replace(/^.*[\\/]/, "").split("?")[0] || "";
  const m = /\.([a-z0-9]{2,5})$/i.exec(base);
  return m ? m[1].toLowerCase() : "jpg";
}

async function signedOriginal(photo: Photo): Promise<{
  url: string;
  filename: string;
  photoId: string;
} | null> {
  if (!photo.storagePath?.startsWith("studios/")) return null;
  const filename = downloadFilename(
    photo.originalFilename,
    photo.id,
    originalExtension(photo),
  );
  try {
    const url = await getSignedMediaDownloadUrl(photo.storagePath, {
      expiresInSec: SIGNED_TTL_SEC,
      filename,
    });
    return { url, filename, photoId: photo.id };
  } catch {
    return null;
  }
}

/**
 * Resolve downloadable photos without loading the studio graph (AURA-397).
 * Scoped to galleryId; id-based modes use getPhotosByIds.
 */
async function resolveDownloadPhotos(opts: {
  galleryId: string;
  mode: "all" | "single" | "favorites";
  photoId?: string;
  photoIds?: string[];
  visitorCookie: string | null;
}): Promise<Photo[]> {
  const { galleryId, mode } = opts;

  if (mode === "single" && opts.photoId) {
    const [photo] = await getPhotosByIds([opts.photoId]);
    if (
      !photo ||
      photo.galleryId !== galleryId ||
      !isDownloadableKind(photo.kind)
    ) {
      return [];
    }
    return [photo];
  }

  if (mode === "favorites") {
    const visitorId = parseVisitorIdFromCookieHeader(opts.visitorCookie);
    const favIds = visitorId
      ? await getVisitorFavorites(galleryId, visitorId)
      : [];
    if (!favIds.length) return [];
    const photos = await getPhotosByIds(favIds);
    return photos
      .filter(
        (p) => p.galleryId === galleryId && isDownloadableKind(p.kind),
      )
      .sort(bySortOrder);
  }

  if (opts.photoIds?.length) {
    /* Album-scoped download — inherits parent gallery PIN (AURA-247) */
    const photos = await getPhotosByIds(opts.photoIds);
    return photos
      .filter(
        (p) => p.galleryId === galleryId && isDownloadableKind(p.kind),
      )
      .sort(bySortOrder);
  }

  const all = await listPhotosByGalleryId(galleryId);
  return all.filter((p) => isDownloadableKind(p.kind));
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  const ip = clientIp(req);
  const limited = await rateLimitShared(`download:${token}:${ip}`, 30, 60_000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many attempts. Try again shortly." },
      {
        status: 429,
        headers: { "Retry-After": String(limited.retryAfterSec) },
      },
    );
  }

  const body = await req.json();
  const pin = String(body.pin || "");
  const mode =
    body.mode === "favorites" ? "favorites" : body.photoId ? "single" : "all";
  const maxUrls =
    typeof body.maxUrls === "number" && body.maxUrls > 0
      ? Math.min(Math.floor(body.maxUrls), 200)
      : undefined;
  const startIndex =
    typeof body.startIndex === "number" && body.startIndex >= 0
      ? Math.floor(body.startIndex)
      : 0;

  const gallery = await findGalleryByPublicToken(token);
  if (!gallery?.studioId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const access = await assertPublicGalleryAccess(gallery, { mutate: true });
  if (!access.ok) {
    return NextResponse.json(
      { error: access.error },
      { status: access.status },
    );
  }

  if (gallery.downloadPinHash) {
    const ok = await verifyPin(pin, gallery.downloadPinHash);
    if (!ok) {
      return NextResponse.json({ error: "Invalid PIN" }, { status: 401 });
    }
  }

  const photoIds = Array.isArray(body.photoIds)
    ? body.photoIds.map((id: unknown) => String(id)).filter(Boolean)
    : undefined;

  const photos = await resolveDownloadPhotos({
    galleryId: gallery.id,
    mode,
    photoId: body.photoId ? String(body.photoId) : undefined,
    photoIds: mode === "all" && photoIds?.length ? photoIds : undefined,
    visitorCookie: req.headers.get("cookie"),
  });

  const excludedVideoIds =
    mode === "single"
      ? []
      : photos.filter((p) => p.kind === "video").map((p) => p.id);

  if (!photos.length) {
    return NextResponse.json({ error: "No photos to download" }, { status: 400 });
  }

  if (mode === "single" && photos[0]) {
    const signed = await signedOriginal(photos[0]);
    if (!signed) {
      return NextResponse.json(
        {
          error: photos[0].storagePath
            ? "Original file missing from storage"
            : "Original not available for this photo",
        },
        { status: 404 },
      );
    }
    await recordEvent({
      type: "download_single",
      studioId: gallery.studioId,
      galleryId: gallery.id,
      photoId: photos[0].id,
      sessionId: linkedSessionId(gallery),
      projectId: gallery.projectId || undefined,
    });
    return NextResponse.json({
      url: signed.url,
      filename: signed.filename,
      expiresInSec: SIGNED_TTL_SEC,
    });
  }

  const urls: { url: string; filename: string; photoId: string }[] = [];
  const skipped: string[] = [];
  const included = photos.filter((p) => p.kind !== "video" || mode === "single");
  const batch =
    maxUrls != null ? included.slice(startIndex, startIndex + maxUrls) : included;
  for (const photo of batch) {
    const signed = await signedOriginal(photo);
    if (signed) urls.push(signed);
    else skipped.push(photo.id);
  }

  if (!urls.length) {
    return NextResponse.json(
      {
        error:
          "No downloadable originals found. Publish the gallery or re-upload photos.",
      },
      { status: 400 },
    );
  }

  await recordEvent({
    type: "download_bulk",
    studioId: gallery.studioId,
    galleryId: gallery.id,
    sessionId: linkedSessionId(gallery),
    projectId: gallery.projectId || undefined,
    meta: {
      count: urls.length,
      mode,
      signed: true,
      skipped: skipped.length,
      videosExcluded: excludedVideoIds.length,
      ...(maxUrls != null ? { batch: true, startIndex } : {}),
    },
  });

  const totalIncluded = included.length;
  const nextIndex =
    maxUrls != null && startIndex + urls.length < totalIncluded
      ? startIndex + urls.length
      : undefined;

  return NextResponse.json({
    urls,
    expiresInSec: SIGNED_TTL_SEC,
    mode,
    skipped: skipped.length ? skipped : undefined,
    videosExcluded: excludedVideoIds.length ? excludedVideoIds : undefined,
    totalIncluded,
    nextIndex,
  });
}
