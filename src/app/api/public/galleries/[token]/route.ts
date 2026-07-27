import { NextResponse } from "next/server";
import {
  findGalleryByPublicToken,
  readStudioDb,
  updateStudioDb,
} from "@/lib/db/store";
import { recordEvent } from "@/lib/analytics";
import { resolveMediaUrl } from "@/lib/media-url";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  const galleryHit = await findGalleryByPublicToken(token);
  if (!galleryHit?.studioId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const db = await readStudioDb(galleryHit.studioId);
  const gallery = db.galleries.find((g) => g.publicToken === token);
  if (!gallery) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (gallery.status === "live" && new Date(gallery.expiresAt) < new Date()) {
    await updateStudioDb(gallery.studioId, (d) => {
      const g = d.galleries.find((x) => x.id === gallery.id);
      if (g) g.status = "expired";
    });
    gallery.status = "expired";
  }

  const photos = db.photos
    .filter((p) => p.galleryId === gallery.id)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((p) => ({
      id: p.id,
      kind: p.kind,
      thumbUrl: resolveMediaUrl(p.thumbUrl),
      url: resolveMediaUrl(
        p.kind === "video"
          ? p.videoUrl || p.webUrl
          : gallery.watermarkEnabled
            ? p.watermarkedUrl
            : p.webUrl,
      ),
      videoUrl: resolveMediaUrl(p.videoUrl),
      aspect: p.aspect,
      version: p.version,
    }));

  const sessionId = gallery.sessionId || gallery.shootId;
  const session = sessionId
    ? db.sessions.find((s) => s.id === sessionId)
    : null;
  const project = session
    ? db.projects.find((c) => c.id === session.projectId)
    : null;

  const photoById = new Map(photos.map((p) => [p.id, p]));
  const subAlbums = db.subAlbums
    .filter((s) => s.galleryId === gallery.id)
    .map((s) => {
      const cover = s.photoIds.map((id) => photoById.get(id)).find(Boolean);
      return {
        id: s.id,
        token: s.token,
        label: s.label,
        count: s.photoIds.length,
        coverUrl: resolveMediaUrl(cover?.thumbUrl || cover?.url),
      };
    });

  await recordEvent({
    type: "gallery_view",
    studioId: gallery.studioId,
    galleryId: gallery.id,
    shootId: gallery.shootId,
  });

  const { downloadPinHash: _, ...safe } = gallery;

  return NextResponse.json({
    gallery: {
      ...safe,
      coverPhotoUrl: resolveMediaUrl(safe.coverPhotoUrl),
    },
    photos,
    clientName: project?.name || null,
    subAlbums,
    studio: {
      name: db.studio.name,
      logoUrl: resolveMediaUrl(db.studio.logoUrl),
      brandTagline: db.studio.brandTagline,
      printPartners: db.studio.printPartners,
    },
    comments: gallery.commentsEnabled
      ? db.comments.filter((c) => c.galleryId === gallery.id)
      : [],
  });
}
