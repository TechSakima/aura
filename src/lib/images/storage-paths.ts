/**
 * Original ↔ derivative object paths (AURA-113).
 * Originals may be `.jpg` / `.png` / `.webp` / `.bin`; sharp pipeline
 * derivatives are `.webp`. Raw (no-sharp) uploads keep the original ext.
 */

export type ParsedOriginalPath = {
  /** Path up to (not including) `/originals/` */
  root: string;
  id: string;
  ext: string;
};

export type DerivativeObjectPaths = {
  thumbPath: string;
  webPath: string;
  wmPath: string;
  rawThumbPath: string;
  rawWebPath: string;
  rawWmPath: string;
};

const ORIGINAL_RE = /^(.*)\/originals\/([^/]+)\.([^./]+)$/i;

export function parseOriginalObjectPath(
  storagePath: string,
): ParsedOriginalPath | null {
  const m = storagePath.match(ORIGINAL_RE);
  if (!m?.[1] || !m[2] || !m[3]) return null;
  return {
    root: m[1],
    id: m[2],
    ext: m[3].toLowerCase(),
  };
}

/** Basename id from `…/originals/{id}.{ext}` (any extension). */
export function originalBasenameId(storagePath: string): string {
  const parsed = parseOriginalObjectPath(storagePath);
  if (parsed) return parsed.id;
  return storagePath.split("/").pop()?.replace(/\.[^.]+$/i, "") || "";
}

/**
 * Canonical webp derivative paths + same-ext raw fallbacks for no-sharp uploads.
 */
export function derivativeObjectPaths(
  storagePath: string,
): DerivativeObjectPaths | null {
  const parsed = parseOriginalObjectPath(storagePath);
  if (!parsed) return null;
  const deriv = `${parsed.root}/derivatives`;
  const { id, ext } = parsed;
  return {
    thumbPath: `${deriv}/${id}-thumb.webp`,
    webPath: `${deriv}/${id}-web.webp`,
    wmPath: `${deriv}/${id}-wm.webp`,
    rawThumbPath: `${deriv}/${id}-thumb.${ext}`,
    rawWebPath: `${deriv}/${id}-web.${ext}`,
    rawWmPath: `${deriv}/${id}-wm.${ext}`,
  };
}

/** All derivative object keys to delete for an original (webp + raw twin). */
export function derivativePathsToDelete(storagePath: string): string[] {
  const paths = derivativeObjectPaths(storagePath);
  if (!paths) {
    const stem = storagePath.replace(/\/originals\/[^/]+$/, "");
    const id = originalBasenameId(storagePath);
    if (!stem || !id) return [];
    return [
      `${stem}/derivatives/${id}-thumb.webp`,
      `${stem}/derivatives/${id}-web.webp`,
      `${stem}/derivatives/${id}-wm.webp`,
    ];
  }
  const set = new Set([
    paths.thumbPath,
    paths.webPath,
    paths.wmPath,
    paths.rawThumbPath,
    paths.rawWebPath,
    paths.rawWmPath,
  ]);
  return [...set];
}
