import { NextResponse } from "next/server";
import { findGalleryByPublicToken } from "@/lib/db/store";
import { recordEvent } from "@/lib/analytics";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  const body = await req.json();
  const gallery = await findGalleryByPublicToken(token);
  if (!gallery) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await recordEvent({
    type: "photo_view",
    studioId: gallery.studioId,
    galleryId: gallery.id,
    shootId: gallery.shootId,
    photoId: String(body.photoId || ""),
  });
  return NextResponse.json({ ok: true });
}
