import "server-only";

import {
  BROWSE_SIGNED_TTL_SEC,
  objectPathFromMediaUrl,
  resolveMediaUrl,
} from "@/lib/media-url";
import { getSignedMediaDownloadUrl } from "@/lib/storage/upload";
import { isR2Configured } from "@/lib/storage/r2-store";

export { BROWSE_SIGNED_TTL_SEC };

/**
 * Public browse URL (AURA-357): R2 signed GET when configured, else `/api/media` proxy.
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

  if (!isR2Configured()) {
    return (
      resolveMediaUrl(url) ||
      `/api/media/${objectPath
        .split("/")
        .map(encodeURIComponent)
        .join("/")}`
    );
  }

  try {
    return await getSignedMediaDownloadUrl(objectPath, {
      expiresInSec: opts?.expiresInSec ?? BROWSE_SIGNED_TTL_SEC,
    });
  } catch {
    return resolveMediaUrl(url);
  }
}

export async function resolveBrowseMediaUrls(
  urls: Array<string | null | undefined>,
  opts?: { expiresInSec?: number },
): Promise<Array<string | undefined>> {
  return Promise.all(urls.map((u) => resolveBrowseMediaUrl(u, opts)));
}
