import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import {
  ensureProjectAdminSlug,
  ensureSessionAdminSlug,
  findSessionByRef,
} from "@/lib/admin-slug";
import {
  listPhotosByGalleryId,
  readStudioDb,
  updateStudioDb,
} from "@/lib/db/store";
import {
  resolveBrowseMediaUrl,
  resolvePhotoBrowseFields,
} from "@/lib/media-url-server";
import { deriveWizardProgress } from "@/lib/wizard/steps";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: ref } = await ctx.params;
  let db = await readStudioDb(admin.studioId, {
    photos: false,
    analytics: false,
  });
  let session = findSessionByRef(db, ref);
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!session.adminSlug || !db.projects.find((p) => p.id === session!.projectId)?.adminSlug) {
    await updateStudioDb(admin.studioId, (d) => {
      const s = d.sessions.find((x) => x.id === session!.id);
      if (s) ensureSessionAdminSlug(d, s);
      const p = d.projects.find((x) => x.id === session!.projectId);
      if (p) ensureProjectAdminSlug(d, p);
    });
    db = await readStudioDb(admin.studioId, {
      photos: false,
      analytics: false,
    });
    session = db.sessions.find((s) => s.id === session!.id) || session;
  }

  const id = session.id;
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
  const photos = gallery ? await listPhotosByGalleryId(gallery.id) : [];
  const photoCount = photos.length;

  const progress = deriveWizardProgress({
    shoot: session,
    proposal,
    plan,
    gallery,
    photoCount,
  });

  const browsedPhotos = await Promise.all(
    photos.map(async (p) => {
      const b = await resolvePhotoBrowseFields(p);
      return {
        id: b.id,
        kind: b.kind,
        thumbUrl: b.thumbUrl,
        watermarkedUrl: b.watermarkedUrl,
        videoUrl: b.videoUrl,
        version: b.version,
        sortOrder: b.sortOrder,
      };
    }),
  );

  let safeGallery = null;
  if (gallery) {
    const { downloadPinHash, ...rest } = gallery;
    const coverPhotoUrl = await resolveBrowseMediaUrl(rest.coverPhotoUrl);
    safeGallery = {
      ...rest,
      ...(coverPhotoUrl !== undefined ? { coverPhotoUrl } : {}),
      hasDownloadPin: Boolean(downloadPinHash),
    };
  }

  return NextResponse.json({
    project,
    session,
    proposal,
    plan,
    gallery: safeGallery,
    photoCount,
    photos: browsedPhotos,
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
