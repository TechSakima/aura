/** Safe attachment filename from an original upload name. */
export function downloadFilename(
  originalFilename: string | undefined,
  fallbackId: string,
  ext = "jpg",
): string {
  const raw = (originalFilename || "").trim();
  if (!raw) return `${fallbackId}.${ext}`;
  const base = raw.replace(/^.*[\\/]/, "");
  const cleaned = base
    .replace(/[^\w.\- ()[\]]+/g, "_")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned || cleaned === "." || cleaned === "..") {
    return `${fallbackId}.${ext}`;
  }
  if (/\.[a-z0-9]{2,5}$/i.test(cleaned)) return cleaned;
  return `${cleaned}.${ext}`;
}

/** Unique zip entry name when duplicates collide. */
export function uniqueZipName(used: Set<string>, name: string): string {
  if (!used.has(name.toLowerCase())) {
    used.add(name.toLowerCase());
    return name;
  }
  const dot = name.lastIndexOf(".");
  const stem = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : "";
  let i = 2;
  let next = `${stem}-${i}${ext}`;
  while (used.has(next.toLowerCase())) {
    i += 1;
    next = `${stem}-${i}${ext}`;
  }
  used.add(next.toLowerCase());
  return next;
}

/** Parse filename from a Content-Disposition header. */
export function filenameFromContentDisposition(
  header: string | null,
): string | null {
  if (!header) return null;
  const star = /filename\*=(?:UTF-8''|utf-8'')([^;]+)/i.exec(header);
  if (star?.[1]) {
    try {
      return decodeURIComponent(star[1].trim().replace(/^"|"$/g, ""));
    } catch {
      return star[1].trim().replace(/^"|"$/g, "");
    }
  }
  const plain = /filename="([^"]+)"/i.exec(header) || /filename=([^;]+)/i.exec(header);
  return plain?.[1]?.trim() || null;
}
