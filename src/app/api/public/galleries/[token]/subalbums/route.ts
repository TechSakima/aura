import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import {
  findGalleryByPublicToken,
  updateStudioDb,
} from "@/lib/db/store";
import { assertPublicGalleryAccess } from "@/lib/public-access";
import { publicToken } from "@/lib/tokens";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  const body = await req.json();
  const label = String(body.label || "Shared album").trim();
  const photoIds: string[] = Array.isArray(body.photoIds) ? body.photoIds : [];
  if (!photoIds.length) {
    return NextResponse.json(
      { error: "Select at least one photo" },
      { status: 400 },
    );
  }

  const hit = await findGalleryByPublicToken(token);
  if (!hit?.studioId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const access = await assertPublicGalleryAccess(hit, { mutate: true });
  if (!access.ok) {
    return NextResponse.json(
      { error: access.error },
      { status: access.status },
    );
  }

  const sub = await updateStudioDb(hit.studioId, (db) => {
    const gallery = db.galleries.find((g) => g.publicToken === token);
    if (!gallery) return null;
    const album = {
      id: nanoid(),
      studioId: gallery.studioId,
      galleryId: gallery.id,
      token: publicToken(),
      label,
      photoIds,
      createdAt: new Date().toISOString(),
    };
    db.subAlbums.push(album);
    return album;
  });

  if (!sub) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ subAlbum: sub });
}
