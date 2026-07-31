import { resolveFontPreset } from "@/lib/themes";
import type { FontPresetId } from "@/lib/types";

/** Pairings that need faces beyond root Fraunces + Figtree (AURA-398). */
export function presetNeedsKitFonts(
  preset?: FontPresetId | string | null,
): boolean {
  const id = resolveFontPreset(preset);
  return id === "editorial" || id === "modern" || id === "soft";
}

export type KitFontModule =
  | "newsreader"
  | "dm-sans"
  | "syne"
  | "cormorant";

export function kitModulesForPreset(
  preset?: FontPresetId | string | null,
): KitFontModule[] {
  const id = resolveFontPreset(preset);
  switch (id) {
    case "editorial":
      return ["newsreader", "dm-sans"];
    case "modern":
      return ["syne", "dm-sans"];
    case "soft":
      return ["cormorant"];
    default:
      return [];
  }
}
