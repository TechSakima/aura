import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { readStudioDb, updateStudioDb } from "@/lib/db/store";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await readStudioDb(admin.studioId);
  return NextResponse.json({
    studio: db.studio,
    watermarkPresets: db.watermarkPresets,
  });
}

export async function PATCH(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();

  await updateStudioDb(admin.studioId, (db) => {
    if (typeof body.name === "string") db.studio.name = body.name;
    if (typeof body.brandTagline === "string") db.studio.brandTagline = body.brandTagline;
    if (typeof body.logoUrl === "string") db.studio.logoUrl = body.logoUrl;
    if (typeof body.defaultWatermarkPresetId === "string") {
      db.studio.defaultWatermarkPresetId = body.defaultWatermarkPresetId;
    }
    if (Array.isArray(body.printPartners)) {
      db.studio.printPartners = body.printPartners;
    }
  });

  return NextResponse.json({ ok: true });
}
