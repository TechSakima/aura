import {
  isGalleryCoverStyle,
  resolveCoverTreatment,
  type CoverTreatmentId,
} from "@/lib/gallery-cover-treatments";
import {
  resolveGalleryDesignPreset,
  type GalleryDesignPresetPackage,
} from "@/lib/gallery-design-presets";
import { isGalleryThemeId } from "@/lib/themes";
import { asGalleryBrandSource } from "@/lib/gallery-brand";
import {
  asGalleryDensity,
  asGalleryMotion,
} from "@/lib/gallery-experience";
import type {
  GalleryChromeModule,
  GalleryCoachModule,
  GalleryCoverModule,
  GalleryCoverStyle,
  GalleryDesign,
  GalleryDownloadModule,
  GalleryGridMode,
  GalleryGridModule,
  GalleryHeroLayout,
  GallerySelectsModule,
  GalleryThemeId,
  GalleryTitleTreatment,
} from "@/lib/types";
import { DEFAULT_GALLERY_DESIGN } from "@/lib/types";
const GRID_MODES = new Set<string>([
  "masonry",
  "justified",
  "columns",
  "diary",
]);
const HERO_LAYOUTS = new Set<string>([
  "split",
  "centered",
  "vertical",
  "minimal",
  "cinematic",
]);
const TITLE_TREATMENTS = new Set<string>([
  "display-light",
  "display-vertical",
  "sans-wide",
  "sans-tight",
]);
const CHROME_VARIANTS = new Set<string>([
  "sticky-minimal",
  "floating",
  "bottom-bar",
  "branded",
]);

function asCoverStyle(value: unknown, fallback: GalleryCoverStyle): GalleryCoverStyle {
  return isGalleryCoverStyle(value) ? value : fallback;
}

/** Apply a cover treatment from the library (AURA-244). Keeps photo/focal. */
export function applyCoverTreatment(
  current: GalleryDesign,
  treatmentId: CoverTreatmentId,
): GalleryDesign {
  const treatment = resolveCoverTreatment(treatmentId);
  const base = normalizeGalleryDesign(current);
  return normalizeGalleryDesign({
    ...base,
    coverStyle: treatment.style,
    cover: {
      ...base.cover,
      ...treatment.coverDefaults,
      style: treatment.style,
      photoId: base.cover.photoId,
      focalX: base.cover.focalX,
      focalY: base.cover.focalY,
    },
  });
}

function asGridMode(value: unknown, fallback: GalleryGridMode): GalleryGridMode {
  return typeof value === "string" && GRID_MODES.has(value)
    ? (value as GalleryGridMode)
    : fallback;
}

function asHeroLayout(
  value: unknown,
  fallback: GalleryHeroLayout,
): GalleryHeroLayout {
  return typeof value === "string" && HERO_LAYOUTS.has(value)
    ? (value as GalleryHeroLayout)
    : fallback;
}

function asTitleTreatment(
  value: unknown,
  fallback: GalleryTitleTreatment,
): GalleryTitleTreatment {
  return typeof value === "string" && TITLE_TREATMENTS.has(value)
    ? (value as GalleryTitleTreatment)
    : fallback;
}

function asChromeVariant(
  value: unknown,
  fallback: GalleryChromeModule["variant"],
): GalleryChromeModule["variant"] {
  return typeof value === "string" && CHROME_VARIANTS.has(value)
    ? (value as GalleryChromeModule["variant"])
    : fallback;
}

function asThemeId(value: unknown): GalleryThemeId {
  return isGalleryThemeId(value) ? value : DEFAULT_GALLERY_DESIGN.themeId;
}

/** @deprecated Prefer package.cover.titleTreatment via resolveGalleryDesignPreset */
export function titleTreatmentForTheme(
  themeId: GalleryThemeId,
): GalleryTitleTreatment {
  return resolveGalleryDesignPreset(themeId).cover.titleTreatment;
}

function packageFor(themeId: GalleryThemeId): GalleryDesignPresetPackage {
  return resolveGalleryDesignPreset(themeId);
}

function syncFlatMirrors(design: GalleryDesign): GalleryDesign {
  design.coverStyle = design.cover.style;
  design.gridMode = design.grid.mode;
  design.coverPhotoId = design.cover.photoId;
  design.coverFocalX = design.cover.focalX;
  design.coverFocalY = design.cover.focalY;
  return design;
}

/**
 * Normalize gallery design v2 — migrate flat-only docs; missing modules from package (AURA-239/240).
 */
export function normalizeGalleryDesign(
  raw?: Partial<GalleryDesign> | null,
): GalleryDesign {
  const themeId = asThemeId(raw?.themeId);
  const pack = packageFor(themeId);
  const baseCover = pack.cover;
  const flatStyle = asCoverStyle(
    raw?.coverStyle ?? raw?.cover?.style,
    baseCover.style,
  );
  const flatGrid = asGridMode(
    raw?.gridMode ?? raw?.grid?.mode,
    pack.grid.mode,
  );

  const coverIn =
    raw?.cover && typeof raw.cover === "object"
      ? (raw.cover as Partial<GalleryCoverModule>)
      : null;

  const cover: GalleryCoverModule = {
    style: asCoverStyle(coverIn?.style, flatStyle),
    photoId:
      (typeof coverIn?.photoId === "string" && coverIn.photoId.trim()
        ? coverIn.photoId.trim()
        : undefined) ||
      (typeof raw?.coverPhotoId === "string" && raw.coverPhotoId.trim()
        ? raw.coverPhotoId.trim()
        : undefined),
    focalX:
      typeof coverIn?.focalX === "number"
        ? coverIn.focalX
        : typeof raw?.coverFocalX === "number"
          ? raw.coverFocalX
          : undefined,
    focalY:
      typeof coverIn?.focalY === "number"
        ? coverIn.focalY
        : typeof raw?.coverFocalY === "number"
          ? raw.coverFocalY
          : undefined,
    layout: asHeroLayout(coverIn?.layout, baseCover.layout),
    titleTreatment: asTitleTreatment(
      coverIn?.titleTreatment,
      baseCover.titleTreatment,
    ),
    showDate:
      typeof coverIn?.showDate === "boolean"
        ? coverIn.showDate
        : baseCover.showDate,
    showDaysLeft:
      typeof coverIn?.showDaysLeft === "boolean"
        ? coverIn.showDaysLeft
        : baseCover.showDaysLeft,
    showCta:
      typeof coverIn?.showCta === "boolean"
        ? coverIn.showCta
        : baseCover.showCta,
    scrim:
      coverIn?.scrim === "strong" || coverIn?.scrim === "soft"
        ? coverIn.scrim
        : baseCover.scrim,
  };

  if (!coverIn && raw?.coverStyle != null) {
    cover.style = flatStyle;
  }
  if (coverIn?.style == null && raw?.coverStyle != null) {
    cover.style = flatStyle;
  }

  const chromeIn =
    raw?.chrome && typeof raw.chrome === "object"
      ? (raw.chrome as Partial<GalleryChromeModule>)
      : null;
  const chrome: GalleryChromeModule = {
    variant: asChromeVariant(chromeIn?.variant, pack.chrome.variant),
    showStudioName:
      typeof chromeIn?.showStudioName === "boolean"
        ? chromeIn.showStudioName
        : pack.chrome.showStudioName,
    showLogo:
      typeof chromeIn?.showLogo === "boolean"
        ? chromeIn.showLogo
        : pack.chrome.showLogo,
  };

  const gridIn =
    raw?.grid && typeof raw.grid === "object"
      ? (raw.grid as Partial<GalleryGridModule>)
      : null;
  const grid: GalleryGridModule = {
    mode: asGridMode(gridIn?.mode, flatGrid),
  };
  if (!gridIn && raw?.gridMode != null) {
    grid.mode = flatGrid;
  }

  const selectsIn =
    raw?.selects && typeof raw.selects === "object"
      ? (raw.selects as Partial<GallerySelectsModule>)
      : null;
  const selects: GallerySelectsModule = {
    showCount:
      typeof selectsIn?.showCount === "boolean"
        ? selectsIn.showCount
        : pack.selects.showCount,
    submitEnabled:
      typeof selectsIn?.submitEnabled === "boolean"
        ? selectsIn.submitEnabled
        : pack.selects.submitEnabled,
  };

  const downloadIn =
    raw?.download && typeof raw.download === "object"
      ? (raw.download as Partial<GalleryDownloadModule>)
      : null;
  const download: GalleryDownloadModule = {
    emphasizePin:
      typeof downloadIn?.emphasizePin === "boolean"
        ? downloadIn.emphasizePin
        : pack.download.emphasizePin,
  };

  const coachIn =
    raw?.coach && typeof raw.coach === "object"
      ? (raw.coach as Partial<GalleryCoachModule>)
      : null;
  const coach: GalleryCoachModule = {
    enabled:
      typeof coachIn?.enabled === "boolean"
        ? coachIn.enabled
        : DEFAULT_GALLERY_DESIGN.coach.enabled,
  };

  const design: GalleryDesign = {
    themeId,
    brandSource: asGalleryBrandSource(raw?.brandSource, "gallery"),
    cover,
    chrome,
    grid,
    selects,
    download,
    motion: asGalleryMotion(raw?.motion, pack.motion),
    density: asGalleryDensity(raw?.density, pack.density),
    coach,
    coverStyle: cover.style,
    gridMode: grid.mode,
    coverPhotoId: cover.photoId,
    coverFocalX: cover.focalX,
    coverFocalY: cover.focalY,
    background:
      typeof raw?.background === "string" ? raw.background : undefined,
    accent: typeof raw?.accent === "string" ? raw.accent : undefined,
    appIconUrl:
      typeof raw?.appIconUrl === "string" && raw.appIconUrl.trim()
        ? raw.appIconUrl.trim()
        : undefined,
  };

  return syncFlatMirrors(design);
}

/** Full design doc from a package (no cover photo). */
export function designFromPreset(presetId?: string | null): GalleryDesign {
  const pack = resolveGalleryDesignPreset(presetId);
  return normalizeGalleryDesign({
    themeId: pack.themeId,
    cover: { ...pack.cover },
    chrome: { ...pack.chrome },
    grid: { ...pack.grid },
    selects: { ...pack.selects },
    download: { ...pack.download },
    motion: pack.motion,
    density: pack.density,
    background: undefined,
    accent: undefined,
  });
}

export type ApplyGalleryDesignPresetOptions = {
  /** Keep current cover.style (default true). */
  preserveCoverStyle?: boolean;
  /** Keep current grid.mode (default true). */
  preserveGridMode?: boolean;
};

/**
 * Apply preset package → full schema (AURA-240).
 * Keeps cover photo/focal + app icon; clears freeform colors.
 */
export function applyGalleryDesignPreset(
  current: GalleryDesign | null | undefined,
  presetId: GalleryThemeId,
  options: ApplyGalleryDesignPresetOptions = {},
): GalleryDesign {
  const preserveCoverStyle = options.preserveCoverStyle !== false;
  const preserveGridMode = options.preserveGridMode !== false;
  const pack = resolveGalleryDesignPreset(presetId);
  const base = current ? normalizeGalleryDesign(current) : null;

  return normalizeGalleryDesign({
    themeId: pack.themeId,
    brandSource: base?.brandSource ?? "gallery",
    cover: {
      ...pack.cover,
      style: preserveCoverStyle && base ? base.cover.style : pack.cover.style,
      photoId: base?.cover.photoId,
      focalX: base?.cover.focalX,
      focalY: base?.cover.focalY,
    },
    chrome: { ...pack.chrome },
    grid: {
      mode: preserveGridMode && base ? base.grid.mode : pack.grid.mode,
    },
    selects: { ...pack.selects },
    download: { ...pack.download },
    motion: pack.motion,
    density: pack.density,
    coach: base?.coach ?? DEFAULT_GALLERY_DESIGN.coach,
    appIconUrl: base?.appIconUrl,
    background: undefined,
    accent: undefined,
  });
}

/** Merge a partial design patch (admin still sends flat fields) into a normalized doc. */
export function applyGalleryDesignPatch(
  current: GalleryDesign | null | undefined,
  patch: Partial<GalleryDesign> & Record<string, unknown>,
): GalleryDesign {
  const base = normalizeGalleryDesign(current);
  const nextTheme = asThemeId(patch.themeId ?? base.themeId);

  /* Theme-only (or theme + flat) change → apply full package, then overlay patch */
  if (patch.themeId != null && nextTheme !== base.themeId) {
    const coverPatch =
      patch.cover && typeof patch.cover === "object"
        ? (patch.cover as Partial<GalleryCoverModule>)
        : null;
    const layoutRetargeted =
      coverPatch?.layout != null && coverPatch.layout !== base.cover.layout;
    const titleRetargeted =
      coverPatch?.titleTreatment != null &&
      coverPatch.titleTreatment !== base.cover.titleTreatment;
    const chromePatched = Boolean(
      patch.chrome && typeof patch.chrome === "object",
    );
    const selectsPatched = Boolean(
      patch.selects && typeof patch.selects === "object",
    );
    const downloadPatched = Boolean(
      patch.download && typeof patch.download === "object",
    );
    const motionPatched = patch.motion != null;

    const fromPackage = applyGalleryDesignPreset(base, nextTheme, {
      preserveCoverStyle: patch.coverStyle == null && coverPatch?.style == null,
      preserveGridMode: patch.gridMode == null && !(patch.grid as GalleryGridModule | undefined)?.mode,
    });

    const mergedCover: GalleryCoverModule = {
      ...fromPackage.cover,
      ...(coverPatch || {}),
      style: asCoverStyle(
        patch.coverStyle ?? coverPatch?.style,
        fromPackage.cover.style,
      ),
      photoId:
        patch.coverPhotoId !== undefined
          ? typeof patch.coverPhotoId === "string" && patch.coverPhotoId.trim()
            ? patch.coverPhotoId.trim()
            : undefined
          : coverPatch?.photoId !== undefined
            ? coverPatch.photoId
            : fromPackage.cover.photoId,
      focalX:
        patch.coverFocalX !== undefined
          ? typeof patch.coverFocalX === "number"
            ? patch.coverFocalX
            : undefined
          : coverPatch?.focalX !== undefined
            ? coverPatch.focalX
            : fromPackage.cover.focalX,
      focalY:
        patch.coverFocalY !== undefined
          ? typeof patch.coverFocalY === "number"
            ? patch.coverFocalY
            : undefined
          : coverPatch?.focalY !== undefined
            ? coverPatch.focalY
            : fromPackage.cover.focalY,
      layout: layoutRetargeted
        ? asHeroLayout(coverPatch!.layout, fromPackage.cover.layout)
        : fromPackage.cover.layout,
      titleTreatment: titleRetargeted
        ? asTitleTreatment(
            coverPatch!.titleTreatment,
            fromPackage.cover.titleTreatment,
          )
        : fromPackage.cover.titleTreatment,
    };

    return normalizeGalleryDesign({
      ...fromPackage,
      ...patch,
      themeId: nextTheme,
      cover: mergedCover,
      chrome: chromePatched
        ? {
            ...fromPackage.chrome,
            ...(patch.chrome as Partial<GalleryChromeModule>),
          }
        : fromPackage.chrome,
      grid: {
        mode: asGridMode(
          patch.gridMode ??
            (patch.grid as GalleryGridModule | undefined)?.mode,
          fromPackage.grid.mode,
        ),
      },
      selects: selectsPatched
        ? {
            ...fromPackage.selects,
            ...(patch.selects as Partial<GallerySelectsModule>),
          }
        : fromPackage.selects,
      download: downloadPatched
        ? {
            ...fromPackage.download,
            ...(patch.download as Partial<GalleryDownloadModule>),
          }
        : fromPackage.download,
      motion: motionPatched
        ? asGalleryMotion(patch.motion, fromPackage.motion)
        : fromPackage.motion,
      density:
        patch.density != null
          ? asGalleryDensity(patch.density, fromPackage.density)
          : fromPackage.density,
      background: patch.background === undefined ? undefined : patch.background,
      accent: patch.accent === undefined ? undefined : patch.accent,
      appIconUrl:
        patch.appIconUrl !== undefined ? patch.appIconUrl : base.appIconUrl,
    });
  }

  const mergedCover: Partial<GalleryCoverModule> = {
    ...base.cover,
    ...(patch.cover && typeof patch.cover === "object" ? patch.cover : {}),
  };
  if (patch.coverStyle != null) {
    mergedCover.style = asCoverStyle(patch.coverStyle, base.cover.style);
  }
  if (patch.coverPhotoId !== undefined) {
    mergedCover.photoId =
      typeof patch.coverPhotoId === "string" && patch.coverPhotoId.trim()
        ? patch.coverPhotoId.trim()
        : undefined;
  }
  if (patch.coverFocalX !== undefined) {
    mergedCover.focalX =
      typeof patch.coverFocalX === "number" ? patch.coverFocalX : undefined;
  }
  if (patch.coverFocalY !== undefined) {
    mergedCover.focalY =
      typeof patch.coverFocalY === "number" ? patch.coverFocalY : undefined;
  }

  const mergedGrid: Partial<GalleryGridModule> = {
    ...base.grid,
    ...(patch.grid && typeof patch.grid === "object" ? patch.grid : {}),
  };
  if (patch.gridMode != null) {
    mergedGrid.mode = asGridMode(patch.gridMode, base.grid.mode);
  }

  return normalizeGalleryDesign({
    ...base,
    ...patch,
    themeId: nextTheme,
    cover: mergedCover as GalleryCoverModule,
    chrome: {
      ...base.chrome,
      ...(patch.chrome && typeof patch.chrome === "object" ? patch.chrome : {}),
    },
    grid: mergedGrid as GalleryGridModule,
    selects: {
      ...base.selects,
      ...(patch.selects && typeof patch.selects === "object"
        ? patch.selects
        : {}),
    },
    download: {
      ...base.download,
      ...(patch.download && typeof patch.download === "object"
        ? patch.download
        : {}),
    },
    background: patch.background === undefined ? undefined : patch.background,
    accent: patch.accent === undefined ? undefined : patch.accent,
    appIconUrl:
      patch.appIconUrl !== undefined ? patch.appIconUrl : base.appIconUrl,
  });
}
