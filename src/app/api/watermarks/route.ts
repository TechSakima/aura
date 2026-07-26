import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { requireAdmin } from "@/lib/auth";
import { readDb, updateDb } from "@/lib/db/store";
import { saveWatermarkAsset } from "@/lib/images/process";
import type { WatermarkMode, WatermarkPosition } from "@/lib/types";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await readDb();
  return NextResponse.json({ presets: db.watermarkPresets });
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const contentType = req.headers.get("content-type") || "";
  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const name = String(form.get("name") || "Watermark");
    const mode = String(form.get("mode") || "text") as WatermarkMode;
    const text = form.get("text") ? String(form.get("text")) : undefined;
    const position = String(
      form.get("position") || "bottom-right",
    ) as WatermarkPosition;
    const opacity = Number(form.get("opacity") || 0.35);
    const scale = form.get("scale") ? Number(form.get("scale")) : 0.14;
    let imagePath: string | undefined;
    const file = form.get("file");
    if (file instanceof File) {
      const buf = Buffer.from(await file.arrayBuffer());
      imagePath = await saveWatermarkAsset(buf, file.name);
    }
    const preset = {
      id: nanoid(),
      name,
      mode,
      text,
      imagePath,
      position,
      opacity,
      scale,
    };
    await updateDb((db) => {
      db.watermarkPresets.push(preset);
      if (!db.studio.defaultWatermarkPresetId) {
        db.studio.defaultWatermarkPresetId = preset.id;
      }
    });
    return NextResponse.json({ preset });
  }

  const body = await req.json();
  const preset = {
    id: nanoid(),
    name: String(body.name || "Watermark"),
    mode: (body.mode || "text") as WatermarkMode,
    text: body.text,
    imagePath: body.imagePath,
    position: (body.position || "bottom-right") as WatermarkPosition,
    opacity: Number(body.opacity ?? 0.35),
    scale: body.scale != null ? Number(body.scale) : 0.14,
  };
  await updateDb((db) => {
    db.watermarkPresets.push(preset);
  });
  return NextResponse.json({ preset });
}
