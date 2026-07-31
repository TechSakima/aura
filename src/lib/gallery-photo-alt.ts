/**
 * Accessible labels for gallery images (AURA-143).
 * Prefer filename when present; otherwise a short ordinal.
 */

export function galleryPhotoBasename(
  filename?: string | null,
): string | undefined {
  const raw = filename?.trim();
  if (!raw) return undefined;
  const base = raw.split(/[/\\]/).pop() || raw;
  return base || undefined;
}

export function galleryPhotoAlt(opts: {
  filename?: string | null;
  index: number;
  total: number;
  kind?: "photo" | "video";
}): string {
  const name = galleryPhotoBasename(opts.filename);
  if (name) return name;
  const noun = opts.kind === "video" ? "Video" : "Photo";
  const n = Math.max(1, opts.index + 1);
  const of = Math.max(n, opts.total);
  return `${noun} ${n} of ${of}`;
}
