import { NextResponse } from "next/server";
import JSZip from "jszip";
import { readDb } from "@/lib/db/store";
import { verifyPin } from "@/lib/pin";
import { recordEvent } from "@/lib/analytics";
import { rateLimit } from "@/lib/rate-limit";
import { downloadStorageBuffer } from "@/lib/storage/upload";

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
  const mode = body.mode === "favorites" ? "favorites" : body.photoId ? "single" : "all";
  const db = await readDb();
  const gallery = db.galleries.find((g) => g.publicToken === token);
  if (!gallery) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (gallery.status === "archived" || gallery.status === "expired") {
    return NextResponse.json({ error: "Gallery unavailable" }, { status: 403 });
  }

  const ok = await verifyPin(pin, gallery.downloadPinHash);
  if (!ok) return NextResponse.json({ error: "Invalid PIN" }, { status: 401 });

  let photos = db.photos.filter(
    (p) => p.galleryId === gallery.id && p.kind === "main",
  );
  if (mode === "single") {
    photos = photos.filter((p) => p.id === body.photoId);
  } else if (mode === "favorites") {
    photos = photos.filter((p) => gallery.favoritePhotoIds.includes(p.id));
  }

  if (!photos.length) {
    return NextResponse.json({ error: "No photos to download" }, { status: 400 });
  }

  async function loadOriginal(storagePath: string) {
    if (storagePath.startsWith("studios/")) {
      return downloadStorageBuffer(storagePath);
    }
    // Legacy local-relative paths are no longer supported
    throw new Error("Missing storage object");
  }

  if (mode === "single" && photos[0]) {
    try {
      const data = await loadOriginal(photos[0].storagePath);
      await recordEvent({
        type: "download_single",
        galleryId: gallery.id,
        photoId: photos[0].id,
        shootId: gallery.shootId,
      });
      return new NextResponse(new Uint8Array(data), {
        headers: {
          "Content-Type": "image/jpeg",
          "Content-Disposition": `attachment; filename="${photos[0].id}.jpg"`,
        },
      });
    } catch {
      return NextResponse.json({ error: "File missing" }, { status: 404 });
    }
  }

  const zip = new JSZip();
  for (const photo of photos) {
    try {
      const data = await loadOriginal(photo.storagePath);
      zip.file(`${photo.id}.jpg`, data);
    } catch {
      // skip missing
    }
  }
  const buffer = await zip.generateAsync({ type: "nodebuffer" });
  await recordEvent({
    type: "download_bulk",
    galleryId: gallery.id,
    shootId: gallery.shootId,
    meta: { count: photos.length, mode },
  });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${gallery.title.replace(/\s+/g, "-")}.zip"`,
    },
  });
}
