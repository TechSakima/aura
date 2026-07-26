import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { requireAdmin } from "@/lib/auth";
import { readDb, updateDb } from "@/lib/db/store";
import { processUpload } from "@/lib/images/process";
import type { Photo } from "@/lib/types";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const db = await readDb();
  const gallery = db.galleries.find((g) => g.id === id);
  if (!gallery) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const form = await req.formData();
    const kind = String(form.get("kind") || "main") === "peek" ? "peek" : "main";
    const files = form
      .getAll("files")
      .filter((f): f is Blob => typeof Blob !== "undefined" && f instanceof Blob);
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
      const processed = await processUpload({
        buffer,
        baseName,
        galleryId: id,
        folder: "galleries",
        watermark,
      });
      const now = new Date().toISOString();
      const photo = {
        id: nanoid(),
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

    await updateDb((d) => {
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
