/** Public gallery / album URL helpers (AURA-434 — albums stay under `/g/` PWA scope). */

export function galleryHref(galleryToken: string): string {
  return `/g/${galleryToken}`;
}

export function galleryPeekHref(galleryToken: string): string {
  return `/g/${galleryToken}/peek`;
}

export function subAlbumHref(galleryToken: string, albumToken: string): string {
  return `/g/${galleryToken}/s/${albumToken}`;
}
