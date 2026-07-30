import { NextResponse } from "next/server";
import {
  findGalleryByPublicToken,
  readStudioDb,
} from "@/lib/db/store";
import {
  downloadFilename,
} from "@/lib/images/download-filename";
import { verifyPin } from "@/lib/pin";
import { recordEvent } from "@/lib/analytics";
import { rateLimit } from "@/lib/rate-limit";
import { getSignedMediaDownloadUrl } from "@/lib/storage/upload";
import {
  getVisitorFavorites,
  parseVisitorIdFromCookieHeader,
} from "@/lib/gallery-favorites";
import { assertPublicGalleryAccess } from "@/lib/public-access";
import type { Photo } from "@/lib/types";

const SIGNED_TTL_SEC = 60 * 15;

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

export async function POST(
  req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const limited = rateLimit(`download:${token}:${ip}`, 30, 60_000);
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

  const galleryHit = await findGalleryByPublicToken(token);
  if (!galleryHit?.studioId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const db = await readStudioDb(galleryHit.studioId);
  const gallery = db.galleries.find((g) => g.publicToken === token);
  if (!gallery) return NextResponse.json({ error: "Not found" }, { status: 404 });

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

  let photos = db.photos.filter(
    (p) =>
      p.galleryId === gallery.id &&
      (p.kind === "main" || p.kind === "peek" || p.kind === "video"),
  );
  if (mode === "single") {
    photos = photos.filter((p) => p.id === body.photoId);
  } else if (mode === "favorites") {
    const visitorId = parseVisitorIdFromCookieHeader(req.headers.get("cookie"));
    const favIds = visitorId
      ? await getVisitorFavorites(gallery.id, visitorId)
      : [];
    photos = photos.filter((p) => favIds.includes(p.id));
  } else if (Array.isArray(body.photoIds) && body.photoIds.length) {
    /* Album-scoped download — inherits parent gallery PIN (AURA-247) */
    const allowed = new Set(
      body.photoIds.map((id: unknown) => String(id)).filter(Boolean),
    );
    photos = photos.filter((p) => allowed.has(p.id));
  }
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
      sessionId: gallery.sessionId || gallery.shootId,
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
    sessionId: gallery.sessionId || gallery.shootId,
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
