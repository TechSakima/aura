import { resolveBrowseMediaUrl } from "@/lib/media-url-server";
import type { Gallery, Photo } from "@/lib/types";

/** First-page size for public gallery GET (AURA-256). */
export const PUBLIC_GALLERY_PHOTO_PAGE = 48;
export const PUBLIC_GALLERY_PHOTO_PAGE_MAX = 120;

export function parsePublicPhotoPage(url: URL): {
  offset: number;
  limit: number;
} {
  const offset = Math.max(0, Number(url.searchParams.get("offset") || 0) || 0);
  const raw = Number(
    url.searchParams.get("limit") || PUBLIC_GALLERY_PHOTO_PAGE,
  );
  const limit = Math.min(
    PUBLIC_GALLERY_PHOTO_PAGE_MAX,
    Math.max(1, Number.isFinite(raw) ? raw : PUBLIC_GALLERY_PHOTO_PAGE),
  );
  return { offset, limit };
}

export type PublicGalleryPhoto = {
  id: string;
  kind: string;
  thumbUrl: string | undefined;
  url: string | undefined;
  videoUrl: string | undefined;
  aspect?: number;
  version: number;
  filename?: string;
};

export async function mapPublicGalleryPhotos(
  photos: Photo[],
  gallery: Pick<Gallery, "watermarkEnabled">,
): Promise<PublicGalleryPhoto[]> {
  return Promise.all(
    photos.map(async (p) => {
      const display =
        p.kind === "video"
          ? p.videoUrl || p.webUrl
          : gallery.watermarkEnabled
            ? p.watermarkedUrl
            : p.webUrl;
      const [thumbUrl, url, videoUrl] = await Promise.all([
        resolveBrowseMediaUrl(p.thumbUrl),
        resolveBrowseMediaUrl(display),
        resolveBrowseMediaUrl(p.videoUrl),
      ]);
      return {
        id: p.id,
        kind: p.kind,
        thumbUrl,
        url,
        videoUrl,
        aspect: p.aspect,
        version: p.version,
        filename: p.originalFilename || undefined,
      };
    }),
  );
}
