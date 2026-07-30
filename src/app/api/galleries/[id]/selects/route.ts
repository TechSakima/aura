import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getGalleryBundle } from "@/lib/db/store";
import {
  galleryFavoritesSummary,
  listGallerySelectSubmissions,
} from "@/lib/gallery-favorites";
import { resolveBrowseMediaUrl } from "@/lib/media-url-server";

/** Studio review of submitted visitor selects (AURA-248). */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const bundle = await getGalleryBundle(id);
  if (!bundle || bundle.gallery.studioId !== admin.studioId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [submissions, summary] = await Promise.all([
    listGallerySelectSubmissions(id),
    galleryFavoritesSummary(id),
  ]);
  const photoById = new Map(bundle.photos.map((p) => [p.id, p]));

  const enriched = await Promise.all(
    submissions.map(async (s) => {
      const thumbs = await Promise.all(
        s.photoIds.slice(0, 8).map(async (photoId) => {
          const photo = photoById.get(photoId);
          if (!photo) return null;
          const url = await resolveBrowseMediaUrl(
            photo.thumbUrl || photo.webUrl || photo.watermarkedUrl,
          );
          return url ? { id: photoId, thumbUrl: url } : null;
        }),
      );
      return {
        id: s.id,
        count: s.count,
        submittedAt: s.submittedAt,
        updatedAt: s.updatedAt,
        photoIds: s.photoIds,
        thumbs: thumbs.filter(Boolean),
      };
    }),
  );

  return NextResponse.json({
    selectLimit: bundle.gallery.selectLimit ?? null,
    ...summary,
    submissions: enriched,
    hasSubmissions: enriched.length > 0,
  });
}
