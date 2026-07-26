import { NextResponse } from "next/server";
import { readDb, updateDb } from "@/lib/db/store";
import { recordEvent } from "@/lib/analytics";
import { resolveMediaUrl } from "@/lib/media-url";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  const db = await readDb();
  const gallery = db.galleries.find((g) => g.publicToken === token);
  if (!gallery) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (gallery.status === "live" && new Date(gallery.expiresAt) < new Date()) {
    await updateDb((d) => {
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
      thumbUrl: p.thumbUrl,
      url: gallery.watermarkEnabled ? p.watermarkedUrl : p.webUrl,
      aspect: p.aspect,
      version: p.version,
    }));

  const shoot = db.shoots.find((s) => s.id === gallery.shootId);
  const client = shoot
    ? db.clients.find((c) => c.id === shoot.clientId)
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
        coverUrl: cover?.thumbUrl || cover?.url,
      };
    });

  await recordEvent({
    type: "gallery_view",
    galleryId: gallery.id,
    shootId: gallery.shootId,
  });

  const { downloadPinHash: _, ...safe } = gallery;

  return NextResponse.json({
    gallery: safe,
    photos,
    clientName: client?.name || null,
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
