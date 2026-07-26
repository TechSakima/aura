import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getGalleryBundle, updateDb } from "@/lib/db/store";
import { markGalleryLive } from "@/lib/gallery-live";
import { reprocessGalleryWatermarks } from "@/lib/images/rewatermark";
import { hashPin, PinValidationError } from "@/lib/pin";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const bundle = await getGalleryBundle(id);
  if (!bundle) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { downloadPinHash: _, ...gallery } = bundle.gallery;
  return NextResponse.json({
    gallery,
    photos: bundle.photos,
    shoot: bundle.shoot,
    client: bundle.client,
    watermarkPresets: bundle.watermarkPresets,
  });
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const body = await req.json();

  try {
    let watermarkChanged = false;
    const gallery = await updateDb(async (db) => {
      const g = db.galleries.find((x) => x.id === id);
      if (!g) return null;
      if (body.title != null) g.title = String(body.title);
      if (body.commentsEnabled != null) g.commentsEnabled = Boolean(body.commentsEnabled);
      if (body.watermarkEnabled != null) {
        const next = Boolean(body.watermarkEnabled);
        if (next !== g.watermarkEnabled) watermarkChanged = true;
        g.watermarkEnabled = next;
      }
      if (body.watermarkPresetId != null) {
        const next = body.watermarkPresetId || undefined;
        if (next !== g.watermarkPresetId) watermarkChanged = true;
        g.watermarkPresetId = next;
      }
      if (body.selectLimit != null) {
        g.selectLimit =
          body.selectLimit === "" || body.selectLimit === null
            ? undefined
            : Number(body.selectLimit);
      }
      if (body.coverPhotoUrl != null) g.coverPhotoUrl = String(body.coverPhotoUrl);
      if (body.extendDays != null) {
        const base = new Date(g.expiresAt).getTime();
        g.expiresAt = new Date(
          base + Number(body.extendDays) * 24 * 60 * 60 * 1000,
        ).toISOString();
        if (g.status === "expired") g.status = "live";
      }
      if (body.expireEarly) {
        g.status = "expired";
        g.expiresAt = new Date().toISOString();
      }
      if (body.goLive) {
        return markGalleryLive(db, id);
      }
      if (body.pin) {
        g.downloadPinHash = await hashPin(String(body.pin));
      }
      if (watermarkChanged) {
        await reprocessGalleryWatermarks(db, id);
      }
      g.updatedAt = new Date().toISOString();
      return g;
    });

    if (!gallery) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const { downloadPinHash: _, ...safe } = gallery;
    return NextResponse.json({ gallery: safe, watermarksReprocessed: watermarkChanged });
  } catch (e) {
    if (e instanceof PinValidationError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    throw e;
  }
}
