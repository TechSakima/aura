import { safeAdminNext } from "@/lib/safe-admin-next";

/** Last useful admin path for installed app resume (AURA-296). */
export const ADMIN_LAST_ROUTE_KEY = "aura-admin-last-route";
/** Session flag — resume at most once per browser session. */
export const ADMIN_RESUME_ONCE_KEY = "aura-admin-resumed";

export function rememberAdminRoute(href: string): void {
  const safe = safeAdminNext(href);
  if (safe === "/admin" || safe.startsWith("/admin?")) return;
  if (safe.startsWith("/admin/login")) return;
  try {
    localStorage.setItem(ADMIN_LAST_ROUTE_KEY, safe);
  } catch {
    /* ignore */
  }
}

export function readAdminLastRoute(): string | null {
  try {
    const raw = localStorage.getItem(ADMIN_LAST_ROUTE_KEY);
    if (!raw) return null;
    const safe = safeAdminNext(raw);
    if (safe === "/admin" || safe.startsWith("/admin/login")) return null;
    return safe;
  } catch {
    return null;
  }
}

/** Prefer remembered hash when login `next` matches the same path. */
export function mergeAdminNextWithLast(next: string): string {
  const dest = safeAdminNext(next);
  const last = readAdminLastRoute();
  if (!last || !last.includes("#")) return dest;
  if (dest.includes("#")) return dest;
  const destBase = dest.split("#")[0] || "";
  const lastBase = last.split("#")[0] || "";
  if (destBase === lastBase) return last;
  return dest;
}
