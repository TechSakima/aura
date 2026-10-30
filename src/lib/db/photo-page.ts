/** In-memory page when the galleryId+sortOrder composite query is unavailable. */
export function pageBySortOrder<T extends { sortOrder?: unknown }>(
  photos: T[],
  offset: number,
  limit: number,
): { photos: T[]; total: number } {
  const sorted = [...photos].sort((a, b) => sortKey(a.sortOrder) - sortKey(b.sortOrder));
  const start = Math.max(0, Math.floor(offset) || 0);
  const size = Math.max(0, Math.floor(limit) || 0);
  return {
    photos: sorted.slice(start, start + size),
    total: sorted.length,
  };
}

function sortKey(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}
