/**
 * Sanitize login `next` so standalone admin never leaves `/admin` scope (AURA-294 / 296).
 * Allows a short safe hash (e.g. `#messages`) for email deep links.
 */

const SAFE_HASH = /^#[a-zA-Z][a-zA-Z0-9_-]{0,64}$/;

export function safeAdminNext(raw: string | null | undefined): string {
  if (!raw) return "/admin";
  let path = raw.trim();
  try {
    path = decodeURIComponent(path);
  } catch {
    return "/admin";
  }
  path = path.trim();
  if (!path.startsWith("/") || path.startsWith("//")) return "/admin";
  if (path.includes("://") || path.includes("\\") || path.includes("@")) {
    return "/admin";
  }

  let fragment = "";
  const hash = path.indexOf("#");
  if (hash >= 0) {
    const frag = path.slice(hash);
    path = path.slice(0, hash);
    if (SAFE_HASH.test(frag)) fragment = frag;
  }

  if (!path.startsWith("/admin")) return "/admin";
  if (path === "/admin/login" || path.startsWith("/admin/login?")) {
    return "/admin";
  }
  return `${path || "/admin"}${fragment}`;
}
