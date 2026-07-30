import { NextResponse } from "next/server";
import { COL } from "@/lib/db/collections";
import {
  findGalleryByPublicToken,
  getProjectById,
  getSessionById,
  getStudioDoc,
  listCommentsByGalleryId,
  listPhotosByGalleryId,
  listSubAlbumsByGalleryId,
  patchStudioDoc,
} from "@/lib/db/store";
import { recordEvent } from "@/lib/analytics";
import { resolveBrowseMediaUrl } from "@/lib/media-url-server";
import { assertPublicGalleryAccess } from "@/lib/public-access";
import {
  publicGalleryUnavailablePayload,
  publicStudioContact,
} from "@/lib/public-gallery-guest";
import {
  mapPublicGalleryPhotos,
  parsePublicPhotoPage,
} from "@/lib/public-gallery-photos";
import { publicPrintPartners } from "@/lib/print-partners";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  const gallery = await findGalleryByPublicToken(token);
  if (!gallery?.studioId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const studio = await getStudioDoc(gallery.studioId);
  if (!studio) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const access = await assertPublicGalleryAccess(gallery);
  if (!access.ok) {
    if (gallery.status === "draft" || gallery.status === "archived") {
      return NextResponse.json(
        await publicGalleryUnavailablePayload(
          gallery,
          studio,
          gallery.status,
        ),
      );
    }
    return NextResponse.json(
      { error: access.error },
      { status: access.status },
    );
  }

  if (gallery.status === "live" && new Date(gallery.expiresAt) < new Date()) {
    await patchStudioDoc(COL.galleries, gallery.id, {
      status: "expired",
      updatedAt: new Date().toISOString(),
    });
    gallery.status = "expired";
  }

  const { offset, limit } = parsePublicPhotoPage(new URL(req.url));
  const isPhotosPage = offset > 0;

  const allPhotos =
    gallery.status === "expired"
      ? []
      : await listPhotosByGalleryId(gallery.id);
  const photoTotal = allPhotos.length;
  const pagePhotos = allPhotos.slice(offset, offset + limit);
  const photos = await mapPublicGalleryPhotos(pagePhotos, gallery);
  const hasMore = offset + photos.length < photoTotal;

  // Photos-only pages: skip meta/analytics (client progressive load).
  if (isPhotosPage) {
    return NextResponse.json({
      photos,
      photoTotal,
      photoOffset: offset,
      photoLimit: limit,
      hasMore,
    });
  }

  const sessionId = gallery.sessionId || gallery.shootId;
  const [session, rawSubAlbums, comments] = await Promise.all([
    sessionId ? getSessionById(sessionId) : Promise.resolve(null),
    listSubAlbumsByGalleryId(gallery.id),
    gallery.commentsEnabled
      ? listCommentsByGalleryId(gallery.id)
      : Promise.resolve([]),
  ]);
  const project = session
    ? await getProjectById(session.projectId)
    : gallery.projectId
      ? await getProjectById(gallery.projectId)
      : null;

  const coverIds = rawSubAlbums
    .map((s) => s.photoIds.find((id) => allPhotos.some((p) => p.id === id)))
    .filter((id): id is string => Boolean(id));
  const coverPhotos = allPhotos.filter((p) => coverIds.includes(p.id));
  const signedCovers = await mapPublicGalleryPhotos(coverPhotos, gallery);
  const coverById = new Map(signedCovers.map((p) => [p.id, p]));

  const subAlbums = rawSubAlbums.map((s) => {
    const coverId = s.photoIds.find((id) => coverById.has(id));
    const cover = coverId ? coverById.get(coverId) : undefined;
    return {
      id: s.id,
      token: s.token,
      label: s.label,
      count: s.photoIds.length,
      coverUrl: cover?.thumbUrl || cover?.url,
    };
  });

  if (!access.preview) {
    await recordEvent({
      type: "gallery_view",
      studioId: gallery.studioId,
      galleryId: gallery.id,
      sessionId: gallery.sessionId || gallery.shootId,
      projectId: session?.projectId || project?.id,
    });
  }

  const { downloadPinHash: _, favoritePhotoIds: _fav, ...safe } = gallery;
  const [coverPhotoUrl, studioContact] = await Promise.all([
    gallery.status === "expired"
      ? Promise.resolve(undefined)
      : resolveBrowseMediaUrl(safe.coverPhotoUrl),
    publicStudioContact(studio),
  ]);

  return NextResponse.json({
    gallery: {
      ...safe,
      // Per-visitor hearts — client loads via GET /favorites (AURA-005).
      favoritePhotoIds: [] as string[],
      coverPhotoUrl,
      hasDownloadPin: Boolean(gallery.downloadPinHash),
    },
    photos,
    photoTotal,
    photoOffset: offset,
    photoLimit: limit,
    hasMore,
    clientName: project?.name || null,
    projectName: project?.name || null,
    subAlbums,
    studio: {
      ...studioContact,
      brandTagline: studio.brandTagline,
      printPartners: publicPrintPartners(studio.printPartners),
    },
    comments,
    preview: access.preview || undefined,
  });
}
