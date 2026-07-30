import type {
  BrandLogoVariants,
  BrandSocialTreatment,
  FontPresetId,
  Studio,
  StudioBrandKit,
  StudioTheme,
} from "@/lib/types";
import {
  resolveFontPreset,
  resolveStudioThemePreset,
  studioThemeFromPreset,
  type StudioThemePreset,
} from "@/lib/themes";

const SOCIAL_TREATMENTS: BrandSocialTreatment[] = ["text", "icons", "pills"];

export function isBrandSocialTreatment(
  value: unknown,
): value is BrandSocialTreatment {
  return (
    typeof value === "string" &&
    (SOCIAL_TREATMENTS as readonly string[]).includes(value)
  );
}

export function resolveBrandSocialTreatment(
  value?: string | null,
): BrandSocialTreatment {
  return isBrandSocialTreatment(value) ? value : "text";
}

/** Nav / chrome logo: lockup → mark → wordmark. */
export function primaryLogoFromKit(logos: BrandLogoVariants): string | undefined {
  return logos.lockupUrl || logos.markUrl || logos.wordmarkUrl || undefined;
}

export function brandKitFromPreset(
  preset: StudioThemePreset,
  fontOverride?: FontPresetId | null,
  logos: BrandLogoVariants = {},
  coverImageUrl?: string,
  socialTreatment: BrandSocialTreatment = "text",
): StudioBrandKit {
  const pairingId = resolveFontPreset(fontOverride || preset.fontPreset);
  return {
    basePresetId: preset.id,
    logos: { ...logos },
    coverImageUrl: coverImageUrl || undefined,
    fonts: { pairingId },
    background: preset.background,
    accent: preset.accent,
    accentSecondary: preset.accentSecondary || preset.muted,
    socialTreatment,
  };
}

/** Build a kit from legacy flat studio fields (migrate-on-read). */
export function brandKitFromLegacyStudio(studio: Studio): StudioBrandKit {
  const preset = resolveStudioThemePreset(studio.theme);
  const pairingId = resolveFontPreset(
    studio.theme?.fontPreset || preset.fontPreset,
  );
  const logos: BrandLogoVariants = {
    ...(studio.logoUrl ? { lockupUrl: studio.logoUrl } : {}),
    ...(studio.coverLogoUrl ? { invertedUrl: studio.coverLogoUrl } : {}),
  };
  if (studio.brandKit?.logos) {
    Object.assign(logos, studio.brandKit.logos);
  }
  return {
    basePresetId: studio.brandKit?.basePresetId || preset.id,
    logos,
    coverImageUrl:
      studio.brandKit?.coverImageUrl ||
      studio.defaultCoverImageUrl ||
      undefined,
    fonts: {
      pairingId: studio.brandKit?.fonts?.pairingId
        ? resolveFontPreset(studio.brandKit.fonts.pairingId)
        : pairingId,
    },
    background:
      studio.brandKit?.background ||
      studio.theme?.background ||
      preset.background,
    accent: studio.brandKit?.accent || studio.theme?.accent || preset.accent,
    accentSecondary:
      studio.brandKit?.accentSecondary ||
      preset.accentSecondary ||
      preset.muted,
    socialTreatment: resolveBrandSocialTreatment(
      studio.brandKit?.socialTreatment,
    ),
  };
}

export function normalizeBrandKit(
  raw: Partial<StudioBrandKit> | null | undefined,
  fallbackStudio?: Studio,
): StudioBrandKit {
  const base = fallbackStudio
    ? brandKitFromLegacyStudio(fallbackStudio)
    : brandKitFromPreset(resolveStudioThemePreset(null));
  if (!raw || typeof raw !== "object") return base;

  const logosIn =
    raw.logos && typeof raw.logos === "object" ? raw.logos : base.logos;
  const logos: BrandLogoVariants = {};
  for (const key of [
    "markUrl",
    "wordmarkUrl",
    "lockupUrl",
    "invertedUrl",
  ] as const) {
    const v = logosIn[key];
    if (typeof v === "string" && v.trim()) logos[key] = v.trim();
  }

  let cover = base.coverImageUrl;
  if (raw && "coverImageUrl" in raw) {
    if (raw.coverImageUrl == null || raw.coverImageUrl === "") {
      cover = undefined;
    } else if (typeof raw.coverImageUrl === "string") {
      cover = raw.coverImageUrl.trim() || undefined;
    }
  }

  return {
    basePresetId:
      typeof raw.basePresetId === "string" && raw.basePresetId.trim()
        ? raw.basePresetId.trim()
        : base.basePresetId,
    logos,
    coverImageUrl: cover,
    fonts: {
      pairingId: resolveFontPreset(
        raw.fonts?.pairingId || base.fonts.pairingId,
      ),
    },
    background:
      typeof raw.background === "string" && raw.background.trim()
        ? raw.background.trim()
        : base.background,
    accent:
      typeof raw.accent === "string" && raw.accent.trim()
        ? raw.accent.trim()
        : base.accent,
    accentSecondary:
      typeof raw.accentSecondary === "string" && raw.accentSecondary.trim()
        ? raw.accentSecondary.trim()
        : base.accentSecondary,
    socialTreatment: resolveBrandSocialTreatment(
      raw.socialTreatment ?? base.socialTreatment,
    ),
  };
}

/** Mirror kit → legacy Studio fields for existing consumers. */
export function applyBrandKitMirrors(studio: Studio, kit: StudioBrandKit): void {
  studio.brandKit = kit;
  const primary = primaryLogoFromKit(kit.logos);
  if (primary) studio.logoUrl = primary;
  else delete studio.logoUrl;
  if (kit.logos.invertedUrl) studio.coverLogoUrl = kit.logos.invertedUrl;
  else delete studio.coverLogoUrl;
  if (kit.coverImageUrl) studio.defaultCoverImageUrl = kit.coverImageUrl;
  else delete studio.defaultCoverImageUrl;
  studio.theme = {
    presetId: kit.basePresetId,
    background: kit.background,
    accent: kit.accent,
    fontPreset: kit.fonts.pairingId,
  } satisfies StudioTheme;
}

/** Ensure studio has a normalized brandKit and legacy mirrors stay aligned. */
export function ensureStudioBrandKit(studio: Studio): StudioBrandKit {
  const kit = normalizeBrandKit(studio.brandKit, studio);
  applyBrandKitMirrors(studio, kit);
  return kit;
}

export function brandKitThemeSlice(kit: StudioBrandKit): StudioTheme {
  return studioThemeFromPreset(
    resolveStudioThemePreset({
      presetId: kit.basePresetId,
      background: kit.background,
      accent: kit.accent,
      fontPreset: kit.fonts.pairingId,
    }),
    kit.fonts.pairingId,
  );
}
