/** Tenant-scoped storage path: studios/{studioId}/... */
export function storageObjectPath(studioId: string, ...parts: string[]): string {
  const id = studioId.replace(/^\/+|\/+$/g, "") || "shared";
  return ["studios", id, ...parts]
    .map((p) => p.replace(/^\/+|\/+$/g, ""))
    .join("/");
}

/**
 * Stable app-relative proxy path for storage (AURA-386).
 * Not loadable alone — APIs mint HMAC via `mintMediaProxyUrl` / `resolveBrowseMediaUrl`.
 */
export function mediaProxyUrl(objectPath: string): string {
  return `/api/media/${objectPath.split("/").map(encodeURIComponent).join("/")}`;
}
