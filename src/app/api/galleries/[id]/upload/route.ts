import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { requireAdmin } from "@/lib/auth";
import { readStudioDb, updateStudioDb } from "@/lib/db/store";
import { processUpload } from "@/lib/images/process";
import type { Photo } from "@/lib/types";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const db = await readStudioDb(admin.studioId);
  const gallery = db.galleries.find((g) => g.id === id);
  if (!gallery) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const form = await req.formData();
    const kindRaw = String(form.get("kind") || "main");
    const kind =
      kindRaw === "peek" ? "peek" : kindRaw === "video" ? "video" : "main";
    const files = form.getAll("files").flatMap((entry) => {
      if (typeof entry === "string") return [];
      // App Hosting/Node may surface uploads as File or Blob.
      if (typeof Blob !== "undefined" && entry instanceof Blob) return [entry];
      return [];
    });
    if (!files.length) {
      return NextResponse.json({ error: "No files" }, { status: 400 });
    }

    const presetId =
      gallery.watermarkPresetId || db.studio.defaultWatermarkPresetId;
    const watermark = gallery.watermarkEnabled
      ? db.watermarkPresets.find((w) => w.id === presetId) || null
      : null;

    const created: Photo[] = [];
    let sortBase = db.photos.filter(
      (p) => p.galleryId === id && p.kind === kind,
    ).length;

    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const baseName = `${id}-${nanoid(10)}`;
      const mime = file.type || "";
      const now = new Date().toISOString();

      if (kind === "video" || mime.startsWith("video/")) {
        const { uploadBuffer } = await import("@/lib/storage/upload");
        const objectPath = `studios/${admin.studioId}/galleries/${id}/video-${nanoid(8)}.mp4`;
        const { path: storagePath, url: videoUrl } = await uploadBuffer({
          buffer,
          objectPath,
          contentType: mime || "video/mp4",
          makePublic: true,
        });
        created.push({
          id: nanoid(),
          studioId: admin.studioId,
          galleryId: id,
          kind: "video",
          storagePath,
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
      const photo = {
        id: nanoid(),
        studioId: admin.studioId,
        galleryId: id,
        kind: kind as "main" | "peek",
        ...processed,
        sortOrder: sortBase++,
        version: 1,
        createdAt: now,
        updatedAt: now,
      };
      created.push(photo);
    }

    await updateStudioDb(admin.studioId, (d) => {
      d.photos.push(...created);
      const g = d.galleries.find((x) => x.id === id);
      if (g && !g.coverPhotoUrl && created[0]) {
        g.coverPhotoUrl = created[0].watermarkedUrl;
        g.updatedAt = new Date().toISOString();
      }
    });

    return NextResponse.json({ photos: created });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Upload failed";
    console.error("[galleries/upload]", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
