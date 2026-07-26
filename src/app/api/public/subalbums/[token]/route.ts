import { NextResponse } from "next/server";
import { readDb } from "@/lib/db/store";
import { recordEvent } from "@/lib/analytics";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  const db = await readDb();
  const album = db.subAlbums.find((s) => s.token === token);
  if (!album) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const gallery = db.galleries.find((g) => g.id === album.galleryId);
  if (!gallery) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const photos = db.photos
    .filter((p) => album.photoIds.includes(p.id))
    .map((p) => ({
      id: p.id,
      url: gallery.watermarkEnabled ? p.watermarkedUrl : p.webUrl,
      thumbUrl: p.thumbUrl,
      aspect: p.aspect,
    }));

  await recordEvent({
    type: "subalbum_view",
    galleryId: gallery.id,
    shootId: gallery.shootId,
    meta: { subAlbumId: album.id },
  });

  return NextResponse.json({
    album: { label: album.label, token: album.token },
    galleryTitle: gallery.title,
    photos,
    studio: { name: db.studio.name },
  });
}
