import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { COL } from "@/lib/db/collections";
import {
  appendStudioDoc,
  findGalleryByPublicToken,
} from "@/lib/db/store";
import { assertPublicGalleryAccess } from "@/lib/public-access";
import type { Comment } from "@/lib/types";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  const body = await req.json();
  const photoId = String(body.photoId || "");
  const authorName = String(body.authorName || "Client");
  const text = String(body.body || "").trim();
  if (!photoId || !text) {
    return NextResponse.json(
      { error: "photoId and body required" },
      { status: 400 },
    );
  }

  const gallery = await findGalleryByPublicToken(token);
  if (!gallery?.studioId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const access = await assertPublicGalleryAccess(gallery, { mutate: true });
  if (!access.ok) {
    return NextResponse.json(
      { error: access.error },
      { status: access.status },
    );
  }
  if (!gallery.commentsEnabled) {
    return NextResponse.json(
      { error: "Comments disabled or not found" },
      { status: 400 },
    );
  }

  const comment: Comment = {
    id: nanoid(),
    studioId: gallery.studioId,
    galleryId: gallery.id,
    photoId,
    authorName,
    body: text,
    createdAt: new Date().toISOString(),
  };
  await appendStudioDoc(COL.comments, comment);
  return NextResponse.json({ comment });
}
