import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { updateDb } from "@/lib/db/store";

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
    return NextResponse.json({ error: "photoId and body required" }, { status: 400 });
  }

  const comment = await updateDb((db) => {
    const gallery = db.galleries.find((g) => g.publicToken === token);
    if (!gallery || !gallery.commentsEnabled) return null;
    const c = {
      id: nanoid(),
      galleryId: gallery.id,
      photoId,
      authorName,
      body: text,
      createdAt: new Date().toISOString(),
    };
    db.comments.push(c);
    return c;
  });

  if (!comment) {
    return NextResponse.json({ error: "Comments disabled or not found" }, { status: 400 });
  }
  return NextResponse.json({ comment });
}
