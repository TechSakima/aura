import { NextResponse } from "next/server";
import { requireAdmin, hashPassword } from "@/lib/auth";
import { readDb, updateDb } from "@/lib/db/store";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await readDb();
  const { adminPasswordHash: _, ...studio } = db.studio;
  return NextResponse.json({
    studio,
    watermarkPresets: db.watermarkPresets,
  });
}

export async function PATCH(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();

  await updateDb((db) => {
    if (typeof body.name === "string") db.studio.name = body.name;
    if (typeof body.brandTagline === "string") db.studio.brandTagline = body.brandTagline;
    if (typeof body.adminEmail === "string") db.studio.adminEmail = body.adminEmail;
    if (typeof body.logoUrl === "string") db.studio.logoUrl = body.logoUrl;
    if (typeof body.defaultWatermarkPresetId === "string") {
      db.studio.defaultWatermarkPresetId = body.defaultWatermarkPresetId;
    }
    if (Array.isArray(body.printPartners)) {
      db.studio.printPartners = body.printPartners;
    }
  });

  if (typeof body.password === "string" && body.password.length >= 8) {
    const hash = await hashPassword(body.password);
    await updateDb((db) => {
      db.studio.adminPasswordHash = hash;
    });
  }

  return NextResponse.json({ ok: true });
}
