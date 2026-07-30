/** Relative width of image watermark vs photo (AURA-335). */
export const DEFAULT_WATERMARK_SCALE = 0.14;

export function clampWatermarkScale(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return DEFAULT_WATERMARK_SCALE;
  return Math.min(0.5, Math.max(0.05, Math.round(n * 100) / 100));
}
