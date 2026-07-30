import { NextResponse } from "next/server";
import { COL } from "@/lib/db/collections";
import {
  findSubAlbumByToken,
  getGalleryById,
  getStudioDoc,
  listPhotosByGalleryId,
  listSubAlbumsByGalleryId,
  patchStudioDoc,
} from "@/lib/db/store";
import { linkedSessionId, recordEvent } from "@/lib/analytics";
import { assertPublicGalleryAccess } from "@/lib/public-access";
import {
  publicGalleryUnavailablePayload,
  publicStudioContact,
} from "@/lib/public-gallery-guest";
import { mapPublicGalleryPhotos } from "@/lib/public-gallery-photos";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  const album = await findSubAlbumByToken(token);
  if (!album?.studioId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const gallery = await getGalleryById(album.galleryId);
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

  if (gallery.status === "expired") {
    return NextResponse.json(
      await publicGalleryUnavailablePayload(gallery, studio, "expired"),
    );
  }

  const [galleryPhotos, siblings] = await Promise.all([
    listPhotosByGalleryId(gallery.id),
    listSubAlbumsByGalleryId(gallery.id),
  ]);
  const byId = new Map(galleryPhotos.map((p) => [p.id, p]));
  const ordered = album.photoIds
    .map((id) => byId.get(id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));
  const photos = await mapPublicGalleryPhotos(ordered, gallery);

  if (!access.preview) {
    await recordEvent({
      type: "subalbum_view",
      studioId: gallery.studioId,
      galleryId: gallery.id,
      sessionId: linkedSessionId(gallery),
      projectId: gallery.projectId || undefined,
      meta: { subAlbumId: album.id },
    });
  }

  const siblingAlbums = siblings.map((a) => ({
    token: a.token,
    label: a.label,
    count: a.photoIds.length,
  }));
  const hasPeek = galleryPhotos.some((p) => p.kind === "peek");

  return NextResponse.json({
    album: {
      label: album.label,
      token: album.token,
      photoIds: album.photoIds,
    },
    galleryTitle: gallery.title,
    gallery: {
      title: gallery.title,
      publicToken: gallery.publicToken,
      design: gallery.design,
      status: gallery.status,
      hasDownloadPin: Boolean(gallery.downloadPinHash),
    },
    albums: siblingAlbums,
    hasPeek,
    photos,
    studio: await publicStudioContact(studio),
  });
}
