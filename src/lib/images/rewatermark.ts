import { reprocessWatermarkedDerivative } from "@/lib/images/process";
import type { AuraDatabase, WatermarkPreset } from "@/lib/types";

function resolveWatermark(
  db: AuraDatabase,
  galleryId: string,
): WatermarkPreset | null {
  const gallery = db.galleries.find((g) => g.id === galleryId);
  if (!gallery?.watermarkEnabled) return null;
  const presetId =
    gallery.watermarkPresetId || db.studio.defaultWatermarkPresetId;
  if (!presetId) return null;
  return db.watermarkPresets.find((w) => w.id === presetId) || null;
}

/** Re-apply watermark to every photo in a gallery. Returns count updated. */
export async function reprocessGalleryWatermarks(
  db: AuraDatabase,
  galleryId: string,
): Promise<{ updated: number; errors: number }> {
  const watermark = resolveWatermark(db, galleryId);
  const photos = db.photos.filter((p) => p.galleryId === galleryId);
  let updated = 0;
  let errors = 0;

  const concurrency = 4;
  for (let i = 0; i < photos.length; i += concurrency) {
    const batch = photos.slice(i, i + concurrency);
    await Promise.all(
      batch.map(async (photo) => {
        try {
          const { watermarkedUrl } = await reprocessWatermarkedDerivative({
            storagePath: photo.storagePath,
            watermark,
          });
          photo.watermarkedUrl = watermarkedUrl;
          photo.version += 1;
          photo.updatedAt = new Date().toISOString();
          updated += 1;
        } catch {
          errors += 1;
        }
      }),
    );
  }

  return { updated, errors };
}

/** Galleries that use this preset (explicitly or via studio default). */
export function galleriesUsingWatermarkPreset(
  db: AuraDatabase,
  presetId: string,
): string[] {
  const isDefault = db.studio.defaultWatermarkPresetId === presetId;
  return db.galleries
    .filter((g) => {
      if (!g.watermarkEnabled) return false;
      if (g.watermarkPresetId) return g.watermarkPresetId === presetId;
      return isDefault;
    })
    .map((g) => g.id);
}
