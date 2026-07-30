import type {
  GalleryChromeModule,
  GalleryCoverModule,
  GalleryDensityPreference,
  GalleryDownloadModule,
  GalleryGridModule,
  GalleryMotionPreference,
  GallerySelectsModule,
  GalleryThemeId,
} from "@/lib/types";
import { isGalleryThemeId } from "@/lib/themes";

/**
 * Design preset packages (AURA-240).
 * Apply → writes full experience schema; `themeId` still resolves the color kit.
 * GalleryHero reads layout/type/CTA from the applied package schema (AURA-241).
 */
export type GalleryDesignPresetPackage = {
  id: GalleryThemeId;
  label: string;
  detail: string;
  themeId: GalleryThemeId;
  cover: GalleryCoverModule;
  chrome: GalleryChromeModule;
  grid: GalleryGridModule;
  selects: GallerySelectsModule;
  download: GalleryDownloadModule;
  motion: GalleryMotionPreference;
  density: GalleryDensityPreference;
};

const COVER_BASE = {
  style: "full" as const,
  showDate: true,
  showDaysLeft: true,
  showCta: true,
  scrim: "soft" as const,
};

export const GALLERY_DESIGN_PRESETS: GalleryDesignPresetPackage[] = [
  {
    id: "echo",
    label: "Echo",
    detail: "Clean split cover, sticky chrome",
    themeId: "echo",
    cover: {
      ...COVER_BASE,
      layout: "split",
      titleTreatment: "sans-wide",
    },
    chrome: {
      variant: "sticky-minimal",
      showStudioName: true,
      showLogo: false,
    },
    grid: { mode: "masonry" },
    selects: { showCount: true, submitEnabled: false },
    download: { emphasizePin: true },
    motion: "system",
    density: "comfortable",
  },
  {
    id: "spring",
    label: "Spring",
    detail: "Vertical display type, soft editorial grid",
    themeId: "spring",
    cover: {
      ...COVER_BASE,
      layout: "vertical",
      titleTreatment: "display-vertical",
      showDaysLeft: false,
    },
    chrome: {
      variant: "sticky-minimal",
      showStudioName: true,
      showLogo: false,
    },
    grid: { mode: "masonry" },
    selects: { showCount: true, submitEnabled: false },
    download: { emphasizePin: true },
    motion: "system",
    density: "airy",
  },
  {
    id: "lark",
    label: "Lark",
    detail: "Tight sans, floating chrome, columns",
    themeId: "lark",
    cover: {
      ...COVER_BASE,
      layout: "split",
      titleTreatment: "sans-tight",
    },
    chrome: {
      variant: "floating",
      showStudioName: true,
      showLogo: false,
    },
    grid: { mode: "columns" },
    selects: { showCount: true, submitEnabled: false },
    download: { emphasizePin: true },
    motion: "system",
    density: "compact",
  },
  {
    id: "sage",
    label: "Sage",
    detail: "Centered light display, calm motion",
    themeId: "sage",
    cover: {
      ...COVER_BASE,
      layout: "centered",
      titleTreatment: "display-light",
    },
    chrome: {
      variant: "sticky-minimal",
      showStudioName: true,
      showLogo: false,
    },
    grid: { mode: "masonry" },
    selects: { showCount: true, submitEnabled: false },
    download: { emphasizePin: false },
    motion: "reduced",
    density: "airy",
  },
  {
    id: "dusk",
    label: "Dusk",
    detail: "Dark echo — strong scrim, sticky chrome",
    themeId: "dusk",
    cover: {
      ...COVER_BASE,
      layout: "split",
      titleTreatment: "sans-wide",
      scrim: "strong",
    },
    chrome: {
      variant: "sticky-minimal",
      showStudioName: true,
      showLogo: false,
    },
    grid: { mode: "masonry" },
    selects: { showCount: true, submitEnabled: false },
    download: { emphasizePin: true },
    motion: "system",
    density: "comfortable",
  },
  {
    id: "obsidian",
    label: "Obsidian",
    detail: "Tight sans, floating chrome, columns",
    themeId: "obsidian",
    cover: {
      ...COVER_BASE,
      layout: "split",
      titleTreatment: "sans-tight",
      scrim: "strong",
    },
    chrome: {
      variant: "floating",
      showStudioName: true,
      showLogo: false,
    },
    grid: { mode: "columns" },
    selects: { showCount: true, submitEnabled: false },
    download: { emphasizePin: true },
    motion: "system",
    density: "compact",
  },
  {
    id: "velvet",
    label: "Velvet",
    detail: "Centered display, branded chrome",
    themeId: "velvet",
    cover: {
      ...COVER_BASE,
      layout: "centered",
      titleTreatment: "display-light",
    },
    chrome: {
      variant: "branded",
      showStudioName: true,
      showLogo: true,
    },
    grid: { mode: "masonry" },
    selects: { showCount: true, submitEnabled: false },
    download: { emphasizePin: true },
    motion: "full",
    density: "airy",
  },
  {
    id: "ember",
    label: "Ember",
    detail: "Vertical type, bottom bar, justified grid",
    themeId: "ember",
    cover: {
      ...COVER_BASE,
      layout: "vertical",
      titleTreatment: "display-vertical",
      scrim: "strong",
      showDaysLeft: false,
    },
    chrome: {
      variant: "bottom-bar",
      showStudioName: true,
      showLogo: false,
    },
    grid: { mode: "justified" },
    selects: { showCount: true, submitEnabled: false },
    download: { emphasizePin: true },
    motion: "full",
    density: "comfortable",
  },
];

const BY_ID = Object.fromEntries(
  GALLERY_DESIGN_PRESETS.map((p) => [p.id, p]),
) as Record<GalleryThemeId, GalleryDesignPresetPackage>;

export function resolveGalleryDesignPreset(
  id?: string | null,
): GalleryDesignPresetPackage {
  if (id && isGalleryThemeId(id)) return BY_ID[id];
  return BY_ID.echo;
}
