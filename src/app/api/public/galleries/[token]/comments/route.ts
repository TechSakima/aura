import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { COL } from "@/lib/db/collections";
import {
  appendStudioDoc,
  findGalleryByPublicToken,
} from "@/lib/db/store";
import { assertPublicGalleryAccess } from "@/lib/public-access";
import {
  COMMENT_MAX_BODY_CHARS,
  COMMENT_MAX_NAME_CHARS,
  isPublicSpamTrap,
  sanitizePublicCommentText,
} from "@/lib/public-spam-guard";
import { clientIp, rateLimitShared } from "@/lib/rate-limit";
import type { Comment } from "@/lib/types";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  const ip = clientIp(req);

  const ipLimit = await rateLimitShared(`comments:${token}:${ip}`, 5, 10 * 60_000);
  if (!ipLimit.ok) {
    return NextResponse.json(
      { error: "Too many attempts. Try again shortly." },
      {
        status: 429,
        headers: { "Retry-After": String(ipLimit.retryAfterSec) },
      },
    );
  }

  const galleryLimit = await rateLimitShared(
    `comments-gallery:${token}`,
    40,
    60 * 60_000,
  );
  if (!galleryLimit.ok) {
    return NextResponse.json(
      { error: "Too many attempts. Try again shortly." },
      {
        status: 429,
        headers: { "Retry-After": String(galleryLimit.retryAfterSec) },
      },
    );
  }

  const body = await req.json().catch(() => ({}));
  const photoId = String(body.photoId || "");
  const authorName = sanitizePublicCommentText(
    String(body.authorName || "Guest"),
    COMMENT_MAX_NAME_CHARS,
  ) || "Guest";
  const text = sanitizePublicCommentText(
    String(body.body || ""),
    COMMENT_MAX_BODY_CHARS,
  );

  // Honeypot / time-trap — silent success so bots don’t learn the field (AURA-108).
  if (
    isPublicSpamTrap({
      honeypot: String(body.company || ""),
      startedAt: Number(body.startedAt),
    })
  ) {
    return NextResponse.json({ ok: true });
  }

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
