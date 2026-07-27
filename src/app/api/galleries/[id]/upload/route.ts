import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { requireAdmin } from "@/lib/auth";
import { appendStudioPhotos, readStudioDb } from "@/lib/db/store";
import { formDataFiles } from "@/lib/form-data";
import type { Photo } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await ctx.params;
    const db = await readStudioDb(admin.studioId);
    const gallery = db.galleries.find((g) => g.id === id);
    if (!gallery) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const form = await req.formData();
    const kindRaw = String(form.get("kind") || "main");
    const kind =
      kindRaw === "peek" ? "peek" : kindRaw === "video" ? "video" : "main";
    const files = formDataFiles(form, "files");
    if (!files.length) {
      return NextResponse.json({ error: "No files" }, { status: 400 });
    }

    const presetId =
      gallery.watermarkPresetId || db.studio.defaultWatermarkPresetId;
    const watermark = gallery.watermarkEnabled
      ? db.watermarkPresets.find((w) => w.id === presetId) || null
      : null;

    const { processUpload } = await import("@/lib/images/process");
    const { uploadBuffer } = await import("@/lib/storage/upload");

    const created: Photo[] = [];
    let sortBase = db.photos.filter(
      (p) => p.galleryId === id && p.kind === kind,
    ).length;

    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      if (!buffer.length) {
        return NextResponse.json({ error: "Empty file" }, { status: 400 });
      }

      const baseName = `${id}-${nanoid(10)}`;
      const mime = file.type || "";
      const now = new Date().toISOString();

      if (kind === "video" || mime.startsWith("video/")) {
        const objectPath = `studios/${admin.studioId}/galleries/${id}/video-${nanoid(8)}.mp4`;
        const { path: storagePath, url: videoUrl } = await uploadBuffer({
          buffer,
          objectPath,
          contentType: mime || "video/mp4",
          makePublic: false,
        });
        created.push({
          id: nanoid(),
          studioId: admin.studioId,
          galleryId: id,
          kind: "video",
          storagePath,
          originalFilename: file.name || undefined,
          thumbUrl: gallery.coverPhotoUrl || videoUrl,
          webUrl: videoUrl,
          watermarkedUrl: videoUrl,
          videoUrl,
          mimeType: mime || "video/mp4",
          sortOrder: sortBase++,
          aspect: 16 / 9,
          version: 1,
          width: 1920,
          height: 1080,
          createdAt: now,
          updatedAt: now,
        });
        continue;
      }

      const processed = await processUpload({
        buffer,
        baseName,
        studioId: admin.studioId,
        galleryId: id,
        folder: "galleries",
        watermark,
      });

      created.push({
        id: nanoid(),
        studioId: admin.studioId,
        galleryId: id,
        kind: kind as "main" | "peek",
        ...processed,
        originalFilename: file.name || undefined,
        mimeType: mime || "image/jpeg",
        sortOrder: sortBase++,
        version: 1,
        createdAt: now,
        updatedAt: now,
      });
    }

    const needsCover = !gallery.coverPhotoUrl && created[0];
    await appendStudioPhotos(admin.studioId, created, {
      galleryId: needsCover ? id : undefined,
      coverPhotoUrl: needsCover ? created[0]!.watermarkedUrl : undefined,
    });

    return NextResponse.json({ photos: created });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Upload failed";
    console.error("[galleries/upload]", message, e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
