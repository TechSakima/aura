/** Ensure external links are absolute so they don't resolve under the app origin. */
export function absoluteExternalUrl(raw?: string | null): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("mailto:") ||
    trimmed.startsWith("tel:")
  ) {
    return trimmed;
  }
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  return `https://${trimmed}`;
}

export function displayHost(raw?: string | null): string {
  const abs = absoluteExternalUrl(raw);
  if (!abs) return "";
  return abs.replace(/^https?:\/\//i, "");
}
