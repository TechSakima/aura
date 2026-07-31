/**
 * Client-safe media URL helpers. Do not import storage/Firebase Admin here —
 * that pulls Node `fs` into the browser bundle.
 */

/** Browse TTL — long enough for a gallery session; refreshed on each page load. */
export const BROWSE_SIGNED_TTL_SEC = 60 * 60 * 6;

/**
 * Client-safe URL normalize. Do not invent unsigned `/api/media` paths
 * (AURA-386 — proxy requires server HMAC). Prefer API `resolveBrowseMediaUrl`.
 */
export function resolveMediaUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  if (url.startsWith("/api/media/")) return url;
  if (url.startsWith("/")) return url;
  return url;
}

/** Recover `studios/...` object path from a stored or proxied media URL. */
export function objectPathFromMediaUrl(url?: string | null): string | null {
  if (!url) return null;
  if (url.startsWith("studios/")) {
    return url.split("?")[0] || null;
  }
  if (url.startsWith("/api/media/")) {
    const rest = url.slice("/api/media/".length).split("?")[0] || "";
    const path = rest
      .split("/")
      .map((p) => decodeURIComponent(p))
      .join("/");
    return path.startsWith("studios/") ? path : null;
  }
  try {
    const parsed = new URL(url);
    if (
      parsed.hostname === "firebasestorage.googleapis.com" ||
      parsed.hostname.endsWith("storage.googleapis.com")
    ) {
      const marker = "/o/";
      const idx = parsed.pathname.indexOf(marker);
      if (idx >= 0) {
        const objectPath = decodeURIComponent(
          parsed.pathname.slice(idx + marker.length),
        );
        return objectPath.startsWith("studios/") ? objectPath : null;
      }
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Sibling derivative object paths for homepage covers (AURA-237).
 * From `-wm` / `-web` / `-thumb` under `/derivatives/` — never originals.
 */
export function homepageCoverDerivativePaths(
  storedCover?: string | null,
): { thumb?: string; large?: string } {
  const path = objectPathFromMediaUrl(storedCover);
  if (!path || path.includes("/originals/")) return {};

  const match = path.match(
    /^(.*\/derivatives\/[^/]+)-(thumb|web|wm)\.(webp|jpe?g|png)$/i,
  );
  if (!match) {
    return { large: path };
  }
  const base = match[1]!;
  const kind = match[2]!.toLowerCase();
  const ext = match[3]!;
  const thumb = `${base}-thumb.${ext}`;
  const wm = `${base}-wm.${ext}`;
  if (kind === "thumb") {
    return { thumb, large: wm };
  }
  return { thumb, large: path };
}

/** Build a `srcSet` string from signed thumb (480) + large (web/wm ~1800). */
export function homepageCoverSrcSet(
  thumbUrl?: string,
  largeUrl?: string,
): string | undefined {
  const parts: string[] = [];
  if (thumbUrl) parts.push(`${thumbUrl} 480w`);
  if (largeUrl && largeUrl !== thumbUrl) parts.push(`${largeUrl} 1800w`);
  return parts.length ? parts.join(", ") : undefined;
}

/** Gallery grid thumb srcSet — same 480 / ~1800 breakpoints (AURA-412). */
export function galleryThumbSrcSet(
  thumbUrl?: string | null,
  largeUrl?: string | null,
): string | undefined {
  return homepageCoverSrcSet(thumbUrl || undefined, largeUrl || undefined);
}

/**
 * `sizes` for public gallery grids — matches MediaGrid column counts (AURA-412).
 * masonry: 2 / 3 / 4 / 5 cols; columns: 2 / 3 / 4; diary full-bleed; justified short strip.
 */
export function galleryThumbSizes(
  mode: "masonry" | "justified" | "columns" | "diary",
): string {
  switch (mode) {
    case "diary":
      return "(min-width: 768px) 48rem, 100vw";
    case "justified":
      return "(min-width: 640px) 200px, 45vw";
    case "columns":
      return "(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw";
    case "masonry":
    default:
      return "(min-width: 1280px) 20vw, (min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw";
  }
}
