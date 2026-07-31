/**
 * Service worker registration scopes per installable surface (AURA-368).
 * Manifest `scope` stays token/slug-specific; SW uses the surface prefix.
 */

export type PwaSwSurface =
  | { kind: "admin"; scope: "/admin/" }
  | { kind: "gallery"; scope: "/g/" }
  | { kind: "homepage"; scope: "/h/" }
  | { kind: "book"; scope: "/book/" }
  | { kind: "none"; scope: null };

export function pwaSwSurfaceForPath(pathname: string): PwaSwSurface {
  if (pathname.startsWith("/admin")) {
    return { kind: "admin", scope: "/admin/" };
  }
  if (pathname.startsWith("/g/")) {
    return { kind: "gallery", scope: "/g/" };
  }
  if (pathname.startsWith("/h/")) {
    return { kind: "homepage", scope: "/h/" };
  }
  if (pathname.startsWith("/book/")) {
    return { kind: "book", scope: "/book/" };
  }
  // Quote / contract / pay / q / cancel — no SW (AURA-299 / 418 lightweight)
  return { kind: "none", scope: null };
}
