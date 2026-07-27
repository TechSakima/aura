import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { readStudioDb, updateStudioDb } from "@/lib/db/store";
import { formDataFile } from "@/lib/form-data";
import { processUpload } from "@/lib/images/process";

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
    const photo = db.photos.find((p) => p.id === id);
    if (!photo) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const gallery = db.galleries.find((g) => g.id === photo.galleryId);
    const presetId =
      gallery?.watermarkPresetId || db.studio.defaultWatermarkPresetId;
    const watermark = gallery?.watermarkEnabled
      ? db.watermarkPresets.find((w) => w.id === presetId) || null
      : null;

    const form = await req.formData();
    const file = formDataFile(form, "file");
    if (!file || file.size === 0) {
      return NextResponse.json({ error: "file required" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const baseName = `${photo.galleryId}-${photo.id}-v${photo.version + 1}`;
    const processed = await processUpload({
      buffer,
      baseName,
      studioId: admin.studioId,
      galleryId: photo.galleryId,
      folder: "galleries",
      watermark,
    });

    const updated = await updateStudioDb(admin.studioId, (d) => {
      const p = d.photos.find((x) => x.id === id);
      if (!p) return null;
      Object.assign(p, processed, {
        version: p.version + 1,
        updatedAt: new Date().toISOString(),
      });
      return p;
    });

    return NextResponse.json({ photo: updated });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Replace failed";
    console.error("[photos/replace]", message, e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
