import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { readStudioDb } from "@/lib/db/store";
import { deriveWizardProgress } from "@/lib/wizard/steps";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const db = await readStudioDb(admin.studioId);
  const session = db.sessions.find((s) => s.id === id);
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const project =
    db.projects.find((c) => c.id === session.projectId) || null;
  const proposal = session.proposalId
    ? db.proposals.find((p) => p.id === session.proposalId) || null
    : db.proposals.find(
        (p) => (p.sessionId || p.shootId) === id,
      ) || null;
  const plan =
    db.shootPlans.find((p) => p.sessionId === id || p.shootId === id) || null;
  const gallery = session.galleryId
    ? db.galleries.find((g) => g.id === session.galleryId) || null
    : db.galleries.find(
        (g) => (g.sessionId || g.shootId) === id,
      ) || null;
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
    shoot: session,
    proposal,
    plan,
    gallery,
    photoCount,
  });

  return NextResponse.json({
    client: project,
    shoot: session,
    proposal,
    plan,
    gallery: safeGallery,
    photoCount,
    photos: photos.map((p) => ({
      id: p.id,
      kind: p.kind,
      thumbUrl: p.thumbUrl,
      watermarkedUrl: p.watermarkedUrl,
      videoUrl: p.videoUrl,
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
