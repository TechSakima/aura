/** Tenant-scoped storage path: studios/{studioId}/... */
export function storageObjectPath(studioId: string, ...parts: string[]): string {
  const id = studioId.replace(/^\/+|\/+$/g, "") || "shared";
  return ["studios", id, ...parts]
    .map((p) => p.replace(/^\/+|\/+$/g, ""))
    .join("/");
}

/** App-relative media proxy URL (works for R2 + Firebase during cutover). */
export function mediaProxyUrl(objectPath: string): string {
  return `/api/media/${objectPath.split("/").map(encodeURIComponent).join("/")}`;
}
