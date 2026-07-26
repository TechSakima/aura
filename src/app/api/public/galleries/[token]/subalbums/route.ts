import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { updateDb } from "@/lib/db/store";
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
    return NextResponse.json({ error: "Select at least one photo" }, { status: 400 });
  }

  const sub = await updateDb((db) => {
    const gallery = db.galleries.find((g) => g.publicToken === token);
    if (!gallery) return null;
    const album = {
      id: nanoid(),
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
