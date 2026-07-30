import {
  brandKitThemeSlice,
  ensureStudioBrandKit,
} from "@/lib/brand-kit";
import type {
  GalleryBrandSource,
  GalleryDesign,
  Studio,
  StudioTheme,
} from "@/lib/types";
import {
  galleryThemeCssVars,
  resolveGalleryTheme,
  resolveStudioThemePreset,
  studioThemeCssVars,
} from "@/lib/themes";

export function asGalleryBrandSource(
  value: unknown,
  fallback: GalleryBrandSource = "gallery",
): GalleryBrandSource {
  return value === "studio" || value === "gallery" ? value : fallback;
}

/** Studio theme slice safe for public clients (no full brandKit). */
export function publicStudioTheme(studio: Studio): StudioTheme {
  const kit = ensureStudioBrandKit(studio);
  return brandKitThemeSlice(kit);
}

/**
 * Resolve CSS vars for a gallery surface (AURA-251).
 * `brandSource: "studio"` → studio brand kit colors/fonts.
 * Otherwise → gallery theme preset (optional legacy bg/accent overrides).
 */
export function resolveGalleryBrandCssVars(
  design:
    | Pick<GalleryDesign, "themeId" | "brandSource" | "background" | "accent">
    | null
    | undefined,
  studioTheme?: StudioTheme | null,
): Record<string, string> {
  const source = asGalleryBrandSource(design?.brandSource);
  if (source === "studio" && studioTheme) {
    const preset = resolveStudioThemePreset(studioTheme);
    const vars = studioThemeCssVars(preset, {
      fontPreset: studioTheme.fontPreset ?? preset.fontPreset,
    });
    return {
      ...vars,
      ["--gallery-page-bg"]: preset.background,
    };
  }
  return galleryThemeCssVars(resolveGalleryTheme(design?.themeId), {
    background: design?.background,
    accent: design?.accent,
  });
}

/** Manifest / OS chrome colors from resolved brand. */
export function resolveGalleryBrandColors(
  design:
    | Pick<GalleryDesign, "themeId" | "brandSource" | "background" | "accent">
    | null
    | undefined,
  studioTheme?: StudioTheme | null,
): { backgroundColor: string; themeColor: string } {
  const source = asGalleryBrandSource(design?.brandSource);
  if (source === "studio" && studioTheme) {
    return {
      backgroundColor: studioTheme.background,
      themeColor: studioTheme.accent,
    };
  }
  const theme = resolveGalleryTheme(design?.themeId);
  return {
    backgroundColor: design?.background || theme.bg,
    themeColor: design?.accent || theme.accent,
  };
}
