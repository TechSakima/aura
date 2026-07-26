import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { readDb } from "@/lib/db/store";
import { deriveWizardProgress } from "@/lib/wizard/steps";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const db = await readDb();
  const shoot = db.shoots.find((s) => s.id === id);
  if (!shoot) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const client = db.clients.find((c) => c.id === shoot.clientId) || null;
  const proposal = shoot.proposalId
    ? db.proposals.find((p) => p.id === shoot.proposalId) || null
    : db.proposals.find((p) => p.shootId === id) || null;
  const plan = db.shootPlans.find((p) => p.shootId === id) || null;
  const gallery = shoot.galleryId
    ? db.galleries.find((g) => g.id === shoot.galleryId) || null
    : db.galleries.find((g) => g.shootId === id) || null;
  const photos = gallery
    ? db.photos.filter((p) => p.galleryId === gallery.id)
    : [];
  const photoCount = photos.length;

  const safeGallery = gallery
    ? (() => {
        const { downloadPinHash: _, ...rest } = gallery;
        return rest;
      })()
    : null;

  const progress = deriveWizardProgress({
    shoot,
    proposal,
    plan,
    gallery,
    photoCount,
  });

  return NextResponse.json({
    client,
    shoot,
    proposal,
    plan,
    gallery: safeGallery,
    photoCount,
    photos: photos.map((p) => ({
      id: p.id,
      kind: p.kind,
      thumbUrl: p.thumbUrl,
      watermarkedUrl: p.watermarkedUrl,
      version: p.version,
      sortOrder: p.sortOrder,
    })),
    packages: db.packageTemplates.map((p) => ({
      id: p.id,
      name: p.name,
      defaultPricing: p.defaultPricing,
    })),
    templates: db.shotListTemplates.map((t) => ({
      id: t.id,
      name: t.name,
      shootType: t.shootType,
      itemCount: t.items.length,
    })),
    watermarkPresets: db.watermarkPresets,
    ...progress,
  });
}
