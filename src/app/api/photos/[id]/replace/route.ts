import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { readStudioDb, updateStudioDb } from "@/lib/db/store";
import { processUpload } from "@/lib/images/process";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const db = await readStudioDb(admin.studioId);
  const photo = db.photos.find((p) => p.id === id);
  if (!photo) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const gallery = db.galleries.find((g) => g.id === photo.galleryId);
  const presetId =
    gallery?.watermarkPresetId || db.studio.defaultWatermarkPresetId;
  const watermark =
    gallery?.watermarkEnabled
      ? db.watermarkPresets.find((w) => w.id === presetId) || null
      : null;

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
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
}
