/** Shared admin list pagination (AURA-268). Mirrors public gallery photo pages. */

export const ADMIN_LIST_PAGE = 50;
export const ADMIN_LIST_PAGE_MAX = 100;

export function parseAdminListPage(url: URL): {
  offset: number;
  limit: number;
} {
  const offset = Math.max(0, Number(url.searchParams.get("offset") || 0) || 0);
  const raw = Number(url.searchParams.get("limit") || ADMIN_LIST_PAGE);
  const limit = Math.min(
    ADMIN_LIST_PAGE_MAX,
    Math.max(1, Number.isFinite(raw) ? raw : ADMIN_LIST_PAGE),
  );
  return { offset, limit };
}

export function slicePage<T>(
  items: T[],
  offset: number,
  limit: number,
): { items: T[]; total: number; hasMore: boolean } {
  const total = items.length;
  const slice = items.slice(offset, offset + limit);
  return {
    items: slice,
    total,
    hasMore: offset + slice.length < total,
  };
}
