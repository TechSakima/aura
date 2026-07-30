/** Datetime ISO + studio TZ (AURA-182). Normalize date-only → ISO; reject ambiguous. */

export function normalizeSessionStartsAt(
  value: unknown,
): string | undefined | null {
  if (value == null || value === "") return undefined;
  const s = String(value).trim();
  if (!s) return undefined;
  // Full ISO already
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s)) {
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString();
  }
  // Date-only → noon UTC (avoid TZ edge)
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const d = new Date(`${s}T12:00:00.000Z`);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString();
  }
  return null;
}
