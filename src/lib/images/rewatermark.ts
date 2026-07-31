import type {
  AuraDatabase,
  Gallery,
  Studio,
  WatermarkPreset,
} from "@/lib/types";

/** Resolve preset for a gallery (null = strip watermark / copy web). */
export function resolveWatermarkForGallery(
  gallery: Gallery,
  studio: Pick<Studio, "defaultWatermarkPresetId">,
  presets: WatermarkPreset[],
): WatermarkPreset | null {
  if (!gallery.watermarkEnabled) return null;
  const presetId =
    gallery.watermarkPresetId || studio.defaultWatermarkPresetId;
  if (!presetId) return null;
  return presets.find((w) => w.id === presetId) || null;
}

/** Galleries that use this preset (explicitly or via studio default). */
export function galleriesUsingWatermarkPreset(
  db: Pick<
    AuraDatabase,
    "galleries" | "studio" | "watermarkPresets"
  >,
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
