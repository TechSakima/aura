import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { COL } from "@/lib/db/collections";
import {
  appendStudioDoc,
  findGalleryByPublicToken,
} from "@/lib/db/store";
import { assertPublicGalleryAccess } from "@/lib/public-access";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { publicToken } from "@/lib/tokens";
import type { SubAlbum } from "@/lib/types";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  const limited = rateLimit(`subalbum:${token}:${clientIp(req)}`, 5, 60_000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many attempts. Try again shortly." },
      {
        status: 429,
        headers: { "Retry-After": String(limited.retryAfterSec) },
      },
    );
  }

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

  const album: SubAlbum = {
    id: nanoid(),
    studioId: hit.studioId,
    galleryId: hit.id,
    token: publicToken(),
    label,
    photoIds,
    createdAt: new Date().toISOString(),
  };
  await appendStudioDoc(COL.subAlbums, album);
  return NextResponse.json({ subAlbum: album });
}
