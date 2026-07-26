import { NextResponse } from "next/server";
import { updateDb } from "@/lib/db/store";
import { recordEvent } from "@/lib/analytics";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  const body = await req.json();
  const photoId = String(body.photoId || "");
  if (!photoId) {
    return NextResponse.json({ error: "photoId required" }, { status: 400 });
  }

  const result = await updateDb((db) => {
    const gallery = db.galleries.find((g) => g.publicToken === token);
    if (!gallery) return null;
    const has = gallery.favoritePhotoIds.includes(photoId);
    if (has) {
      gallery.favoritePhotoIds = gallery.favoritePhotoIds.filter((id) => id !== photoId);
    } else {
      if (
        gallery.selectLimit != null &&
        gallery.favoritePhotoIds.length >= gallery.selectLimit
      ) {
        return { error: "Select limit reached", gallery };
      }
      gallery.favoritePhotoIds.push(photoId);
    }
    gallery.updatedAt = new Date().toISOString();
    return { gallery, toggledOn: !has };
  });

  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if ("error" in result && result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  await recordEvent({
    type: "favorite_toggle",
    galleryId: result.gallery.id,
    photoId,
    meta: { on: Boolean(result.toggledOn) },
  });

  return NextResponse.json({
    favoritePhotoIds: result.gallery.favoritePhotoIds,
  });
}
