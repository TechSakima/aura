import { NextResponse } from "next/server";
import { findGalleryByPublicToken } from "@/lib/db/store";
import { linkedSessionId, recordEvent } from "@/lib/analytics";
import { clientIp, rateLimitShared } from "@/lib/rate-limit";
import {
  FavoritesToggleError,
  getVisitorFavoritesDoc,
  newVisitorId,
  parseVisitorIdFromCookieHeader,
  submitVisitorFavorites,
  toggleVisitorFavorite,
  visitorCookieHeader,
} from "@/lib/gallery-favorites";
import { normalizeGalleryDesign } from "@/lib/gallery-design";
import { notifyStudio } from "@/lib/notify/send";
import { assertPublicGalleryAccess } from "@/lib/public-access";

function withVisitorCookie(
  res: NextResponse,
  visitorId: string,
  setCookie: boolean,
) {
  if (setCookie) {
    res.headers.append("Set-Cookie", visitorCookieHeader(visitorId));
  }
  return res;
}

function favoritesPayload(
  doc: Awaited<ReturnType<typeof getVisitorFavoritesDoc>>,
  gallery: { selectLimit?: number; design?: unknown },
) {
  const design = normalizeGalleryDesign(
    gallery.design as Parameters<typeof normalizeGalleryDesign>[0],
  );
  return {
    favoritePhotoIds: doc?.photoIds || [],
    submittedAt: doc?.submittedAt || null,
    selectLimit: gallery.selectLimit ?? null,
    showCount: design.selects.showCount,
    submitEnabled: design.selects.submitEnabled,
  };
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  const gallery = await findGalleryByPublicToken(token);
  if (!gallery?.studioId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const access = await assertPublicGalleryAccess(gallery);
  if (!access.ok) {
    return NextResponse.json(
      { error: access.error },
      { status: access.status },
    );
  }

  let visitorId = parseVisitorIdFromCookieHeader(req.headers.get("cookie"));
  const isNew = !visitorId;
  if (!visitorId) visitorId = newVisitorId();

  const doc = await getVisitorFavoritesDoc(gallery.id, visitorId);
  return withVisitorCookie(
    NextResponse.json(favoritesPayload(doc, gallery)),
    visitorId,
    isNew,
  );
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  const ip = clientIp(req);
  const body = await req.json().catch(() => ({}));
  const action = body.action === "submit" ? "submit" : "toggle";

  // Shared limits (AURA-108) — tighter than per-process 120/min.
  const limited = await rateLimitShared(
    action === "submit"
      ? `favorites-submit:${token}:${ip}`
      : `favorites:${token}:${ip}`,
    action === "submit" ? 5 : 60,
    action === "submit" ? 10 * 60_000 : 60_000,
  );
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many attempts. Try again shortly." },
      {
        status: 429,
        headers: { "Retry-After": String(limited.retryAfterSec) },
      },
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

  let visitorId = parseVisitorIdFromCookieHeader(req.headers.get("cookie"));
  const isNew = !visitorId;
  if (!visitorId) visitorId = newVisitorId();

  const design = normalizeGalleryDesign(gallery.design);

  if (action === "submit") {
    if (!design.selects.submitEnabled) {
      return NextResponse.json(
        { error: "Select submit is not enabled" },
        { status: 400 },
      );
    }
    try {
      const doc = await submitVisitorFavorites({
        studioId: gallery.studioId,
        galleryId: gallery.id,
        visitorId,
      });
      await recordEvent({
        type: "favorite_toggle",
        studioId: gallery.studioId,
        galleryId: gallery.id,
        sessionId: linkedSessionId(gallery),
        projectId: gallery.projectId || undefined,
        meta: { action: "submit", count: doc.photoIds.length },
      });
      const sessionId = linkedSessionId(gallery);
      await notifyStudio({
        studioId: gallery.studioId,
        type: "selects_submitted",
        title: "Selects submitted",
        body: `${doc.photoIds.length} photo${
          doc.photoIds.length === 1 ? "" : "s"
        } · ${gallery.title}`,
        href: gallery.projectId
          ? sessionId
            ? `/admin/projects/${gallery.projectId}/sessions/${sessionId}?step=delivery`
            : `/admin/projects/${gallery.projectId}#workflow`
          : `/g/${gallery.publicToken}`,
        emailStudio: false,
      });
      return withVisitorCookie(
        NextResponse.json(favoritesPayload(doc, gallery)),
        visitorId,
        isNew,
      );
    } catch (e) {
      return NextResponse.json(
        {
          error:
            e instanceof Error ? e.message : "Could not submit selects",
        },
        { status: 400 },
      );
    }
  }

  const photoId = String(body.photoId || "");
  if (!photoId) {
    return NextResponse.json({ error: "photoId required" }, { status: 400 });
  }

  let doc;
  let toggledOn: boolean;
  try {
    ({ doc, toggledOn } = await toggleVisitorFavorite({
      studioId: gallery.studioId,
      galleryId: gallery.id,
      visitorId,
      photoId,
      selectLimit: gallery.selectLimit,
    }));
  } catch (e) {
    if (e instanceof FavoritesToggleError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Could not update favorites" },
      { status: 500 },
    );
  }

  await recordEvent({
    type: "favorite_toggle",
    studioId: gallery.studioId,
    galleryId: gallery.id,
    sessionId: linkedSessionId(gallery),
    projectId: gallery.projectId || undefined,
    photoId,
    meta: { on: toggledOn },
  });

  return withVisitorCookie(
    NextResponse.json(favoritesPayload(doc, gallery)),
    visitorId,
    isNew,
  );
}
