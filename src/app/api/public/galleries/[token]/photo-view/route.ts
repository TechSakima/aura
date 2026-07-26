import { NextResponse } from "next/server";
import { readDb } from "@/lib/db/store";
import { recordEvent } from "@/lib/analytics";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  const body = await req.json();
  const db = await readDb();
  const gallery = db.galleries.find((g) => g.publicToken === token);
  if (!gallery) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await recordEvent({
    type: "photo_view",
    galleryId: gallery.id,
    shootId: gallery.shootId,
    photoId: String(body.photoId || ""),
  });
  return NextResponse.json({ ok: true });
}
