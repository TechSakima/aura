import "server-only";

import {
  BROWSE_SIGNED_TTL_SEC,
  objectPathFromMediaUrl,
  resolveMediaUrl,
} from "@/lib/media-url";
import { mintMediaProxyUrl } from "@/lib/media-proxy-token";
import { getSignedMediaDownloadUrl } from "@/lib/storage/upload";
import { isR2Configured } from "@/lib/storage/r2-store";

export { BROWSE_SIGNED_TTL_SEC };

/**
 * Public browse URL (AURA-357 / AURA-106 / AURA-386): R2 signed GET when configured
 * (expiring; refreshed on page load), else HMAC-bound `/api/media` proxy.
 * Originals never. PIN does not apply here (download-only).
 * Server-only — do not import from client components.
 */
export async function resolveBrowseMediaUrl(
  url?: string | null,
  opts?: { expiresInSec?: number },
): Promise<string | undefined> {
  if (!url) return undefined;

  if (
    url.startsWith("https://") &&
    (url.includes(".r2.cloudflarestorage.com") || url.includes(".r2.dev"))
  ) {
    return url;
  }

  const objectPath =
    objectPathFromMediaUrl(url) || objectPathFromMediaUrl(resolveMediaUrl(url));
  if (!objectPath) return resolveMediaUrl(url);

  if (objectPath.includes("/originals/")) {
    return undefined;
  }

  const ttl = opts?.expiresInSec ?? BROWSE_SIGNED_TTL_SEC;

  if (!isR2Configured()) {
    return mintMediaProxyUrl(objectPath, { expiresInSec: ttl });
  }

  try {
    return await getSignedMediaDownloadUrl(objectPath, {
      expiresInSec: ttl,
    });
  } catch {
    return mintMediaProxyUrl(objectPath, { expiresInSec: ttl });
  }
}

export async function resolveBrowseMediaUrls(
  urls: Array<string | null | undefined>,
  opts?: { expiresInSec?: number },
): Promise<Array<string | undefined>> {
  return Promise.all(urls.map((u) => resolveBrowseMediaUrl(u, opts)));
}

/** Remint browse fields on photo docs for admin/UI (AURA-386). */
export async function resolvePhotoBrowseFields<
  T extends {
    url?: string;
    thumbUrl?: string;
    webUrl?: string;
    watermarkedUrl?: string;
    videoUrl?: string;
  },
>(photo: T, opts?: { expiresInSec?: number }): Promise<T> {
  const [url, thumbUrl, webUrl, watermarkedUrl, videoUrl] = await Promise.all([
    resolveBrowseMediaUrl(photo.url, opts),
    resolveBrowseMediaUrl(photo.thumbUrl, opts),
    resolveBrowseMediaUrl(photo.webUrl, opts),
    resolveBrowseMediaUrl(photo.watermarkedUrl, opts),
    resolveBrowseMediaUrl(photo.videoUrl, opts),
  ]);
  return {
    ...photo,
    ...(url !== undefined ? { url } : {}),
    ...(thumbUrl !== undefined ? { thumbUrl } : {}),
    ...(webUrl !== undefined ? { webUrl } : {}),
    ...(watermarkedUrl !== undefined ? { watermarkedUrl } : {}),
    ...(videoUrl !== undefined ? { videoUrl } : {}),
  };
}
