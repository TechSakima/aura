import { NextResponse } from "next/server";
import { findGalleryByPublicToken } from "@/lib/db/store";
import { recordEvent } from "@/lib/analytics";
import { rateLimit } from "@/lib/rate-limit";
import {
  getVisitorFavoritesDoc,
  newVisitorId,
  parseVisitorIdFromCookieHeader,
  setVisitorFavorites,
  submitVisitorFavorites,
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
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const limited = rateLimit(`favorites:${token}:${ip}`, 120, 60_000);
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
  const action = body.action === "submit" ? "submit" : "toggle";

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
        sessionId: gallery.sessionId || gallery.shootId,
        projectId: gallery.projectId || undefined,
        meta: { action: "submit", count: doc.photoIds.length },
      });
      await notifyStudio({
        studioId: gallery.studioId,
        type: "selects_submitted",
        title: "Selects submitted",
        body: `${doc.photoIds.length} photo${
          doc.photoIds.length === 1 ? "" : "s"
        } · ${gallery.title}`,
        href: gallery.projectId
          ? `/admin/projects/${gallery.projectId}`
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

  const currentDoc = await getVisitorFavoritesDoc(gallery.id, visitorId);
  if (currentDoc?.submittedAt) {
    return NextResponse.json(
      { error: "Selects already submitted" },
      { status: 400 },
    );
  }

  const current = currentDoc?.photoIds || [];
  const has = current.includes(photoId);
  let next: string[];
  let toggledOn = false;
  if (has) {
    next = current.filter((id) => id !== photoId);
    toggledOn = false;
  } else {
    if (
      gallery.selectLimit != null &&
      current.length >= gallery.selectLimit
    ) {
      return NextResponse.json(
        {
          error: `Select limit reached (${gallery.selectLimit})`,
        },
        { status: 400 },
      );
    }
    next = [...current, photoId];
    toggledOn = true;
  }

  const doc = await setVisitorFavorites({
    studioId: gallery.studioId,
    galleryId: gallery.id,
    visitorId,
    photoIds: next,
  });

  await recordEvent({
    type: "favorite_toggle",
    studioId: gallery.studioId,
    galleryId: gallery.id,
    sessionId: gallery.sessionId || gallery.shootId,
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
