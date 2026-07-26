/**
 * Normalize stored media URLs so images always load through a working path.
 * Brand logos may have been saved as Firebase public URLs (often blocked);
 * prefer the /api/media proxy when we can recover the object path.
 */
export function resolveMediaUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  if (url.startsWith("/api/media/")) return url;
  if (url.startsWith("/")) return url;

  try {
    const parsed = new URL(url);
    if (
      parsed.hostname === "firebasestorage.googleapis.com" ||
      parsed.hostname.endsWith("storage.googleapis.com")
    ) {
      // …/o/<encodedPath>?alt=media
      const marker = "/o/";
      const idx = parsed.pathname.indexOf(marker);
      if (idx >= 0) {
        const encoded = parsed.pathname.slice(idx + marker.length);
        const objectPath = decodeURIComponent(encoded);
        if (objectPath.startsWith("studios/")) {
          return `/api/media/${objectPath
            .split("/")
            .map(encodeURIComponent)
            .join("/")}`;
        }
      }
    }
  } catch {
    // keep original
  }

  return url;
}
