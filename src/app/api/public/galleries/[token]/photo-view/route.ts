import { NextResponse } from "next/server";
import { findGalleryByPublicToken } from "@/lib/db/store";
import { recordEvent } from "@/lib/analytics";
import { assertPublicGalleryAccess } from "@/lib/public-access";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  const body = await req.json();
  const gallery = await findGalleryByPublicToken(token);
  if (!gallery) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const access = await assertPublicGalleryAccess(gallery);
  if (!access.ok) {
    return NextResponse.json(
      { error: access.error },
      { status: access.status },
    );
  }
  await recordEvent({
    type: "photo_view",
    studioId: gallery.studioId,
    galleryId: gallery.id,
    sessionId: gallery.sessionId || gallery.shootId,
    projectId: gallery.projectId || undefined,
    photoId: String(body.photoId || ""),
  });
  return NextResponse.json({ ok: true });
}
