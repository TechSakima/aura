import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { readStudioDb, updateStudioDb } from "@/lib/db/store";
import { formDataFile } from "@/lib/form-data";
import { saveWatermarkAsset } from "@/lib/images/process";
import {
  galleriesUsingWatermarkPreset,
  reprocessGalleryWatermarks,
} from "@/lib/images/rewatermark";
import { deleteStorageObject } from "@/lib/storage/upload";
import type { WatermarkMode, WatermarkPosition } from "@/lib/types";
import { clampWatermarkScale } from "@/lib/watermark-scale";

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;

  const db = await readStudioDb(admin.studioId);
  const existing = db.watermarkPresets.find((x) => x.id === id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const contentType = req.headers.get("content-type") || "";
  let nextImagePath: string | undefined;
  let replaceImage = false;
  let name = existing.name;
  let mode = existing.mode;
  let text = existing.text;
  let position = existing.position;
  let opacity = existing.opacity;
  let scale = existing.scale;

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    if (form.has("name")) name = String(form.get("name") || name);
    if (form.has("mode")) mode = String(form.get("mode") || mode) as WatermarkMode;
    if (form.has("text")) {
      const t = form.get("text");
      text = t ? String(t) : undefined;
    }
    if (form.has("position")) {
      position = String(form.get("position") || position) as WatermarkPosition;
    }
    if (form.has("opacity")) opacity = Number(form.get("opacity") || opacity);
    if (form.has("scale")) {
      const s = form.get("scale");
      scale =
        s != null && String(s) !== ""
          ? clampWatermarkScale(s)
          : scale;
    }
    const file = formDataFile(form, "file");
    if (file && file.size > 0) {
      const buf = Buffer.from(await file.arrayBuffer());
      nextImagePath = await saveWatermarkAsset(
        buf,
        file.name || "mark.png",
        admin.studioId,
      );
      replaceImage = true;
    }
  } else {
    const body = await req.json();
    if (body.name != null) name = String(body.name);
    if (body.mode != null) mode = body.mode as WatermarkMode;
    if (body.text !== undefined) text = body.text ? String(body.text) : undefined;
    if (body.position != null) position = body.position as WatermarkPosition;
    if (body.opacity != null) opacity = Number(body.opacity);
    if (body.scale !== undefined) {
      scale =
        body.scale != null ? clampWatermarkScale(body.scale) : undefined;
    }
  }

  const oldPath = existing.imagePath;
  const result = await updateStudioDb(admin.studioId, async (d) => {
    const p = d.watermarkPresets.find((x) => x.id === id);
    if (!p) return null;
    p.name = name;
    p.mode = mode;
    p.text = text;
    p.position = position;
    p.opacity = opacity;
    p.scale = scale;
    if (replaceImage && nextImagePath) p.imagePath = nextImagePath;

    const galleryIds = galleriesUsingWatermarkPreset(d, id);
    let photosUpdated = 0;
    for (const galleryId of galleryIds) {
      const { updated } = await reprocessGalleryWatermarks(d, galleryId);
      photosUpdated += updated;
    }
    return { preset: p, photosUpdated, galleries: galleryIds.length };
  });

  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (replaceImage && oldPath?.startsWith("studios/") && oldPath !== nextImagePath) {
    await deleteStorageObject(oldPath).catch(() => undefined);
  }

  return NextResponse.json(result);
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;

  const removed = await updateStudioDb(admin.studioId, (db) => {
    const p = db.watermarkPresets.find((x) => x.id === id);
    if (!p) return null;
    db.watermarkPresets = db.watermarkPresets.filter((x) => x.id !== id);
    if (db.studio.defaultWatermarkPresetId === id) {
      db.studio.defaultWatermarkPresetId = db.watermarkPresets[0]?.id;
    }
    return p;
  });

  if (!removed) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (removed.imagePath?.startsWith("studios/")) {
    await deleteStorageObject(removed.imagePath).catch(() => undefined);
  }

  return NextResponse.json({ ok: true });
}
