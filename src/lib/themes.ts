import type { FontPresetId, GalleryThemeId, StudioTheme } from "@/lib/types";

export type ThemeMode = "light" | "dark";

export type StudioThemePreset = {
  id: string;
  label: string;
  mode: ThemeMode;
  background: string;
  accent: string;
  /** Secondary accent for kits (AURA-222); defaults to muted when omitted */
  accentSecondary?: string;
  fontPreset: FontPresetId;
  ink: string;
  muted: string;
  line: string;
  surface: string;
  accentInk: string;
};

export type GalleryThemePreset = {
  id: GalleryThemeId;
  label: string;
  mode: ThemeMode;
  sample: string;
  /** Tailwind classes for theme picker sample text */
  fontClass: string;
  /** Applied to public gallery/peek/sub-album root so theme typography wins */
  fontPreset: FontPresetId;
  bg: string;
  accent: string;
  ink: string;
  muted: string;
  line: string;
  surface: string;
  /** Text on accent fills — dark on light accents, light on dark accents */
  accentInk: string;
  /** Hero title / CTA arrangement */
  layout: "split" | "centered" | "vertical";
};

/** Studio homepage / brand themes — pick only; no free color entry. */
export const STUDIO_THEME_PRESETS: StudioThemePreset[] = [
  {
    id: "linen",
    label: "Linen",
    mode: "light",
    background: "#F3F1ED",
    accent: "#1C1915",
    fontPreset: "sans",
    ink: "#1C1915",
    muted: "#6B6560",
    line: "#E4DFD8",
    surface: "#FAF8F5",
    accentInk: "#FAF8F5",
  },
  {
    id: "sand",
    label: "Sand",
    mode: "light",
    background: "#F5EFE6",
    accent: "#5C4033",
    fontPreset: "serif",
    ink: "#2A2420",
    muted: "#6B5F56",
    line: "#E8DFD2",
    surface: "#FBF7F1",
    accentInk: "#FBF7F1",
  },
  {
    id: "mist",
    label: "Mist",
    mode: "light",
    background: "#EEF2F6",
    accent: "#1F3A5F",
    fontPreset: "sans",
    ink: "#15202B",
    muted: "#5C6B7A",
    line: "#D8E0E8",
    surface: "#F7F9FB",
    accentInk: "#F7F9FB",
  },
  {
    id: "olive",
    label: "Olive",
    mode: "light",
    background: "#F1F4EF",
    accent: "#3D5A40",
    fontPreset: "display",
    ink: "#222822",
    muted: "#5A6358",
    line: "#DCE2D8",
    surface: "#F8FAF7",
    accentInk: "#F8FAF7",
  },
  {
    id: "charcoal",
    label: "Charcoal",
    mode: "dark",
    background: "#1A1A1A",
    accent: "#E8E4DE",
    fontPreset: "sans",
    ink: "#F0EDE8",
    muted: "#9A9590",
    line: "#2E2E2E",
    surface: "#222222",
    accentInk: "#1A1A1A",
  },
  {
    id: "noir",
    label: "Noir",
    mode: "dark",
    background: "#0F0F0F",
    accent: "#C4A574",
    fontPreset: "serif",
    ink: "#F2EDE6",
    muted: "#8A837A",
    line: "#252525",
    surface: "#181818",
    accentInk: "#0F0F0F",
  },
  {
    id: "midnight",
    label: "Midnight",
    mode: "dark",
    background: "#12141A",
    accent: "#8BA4C7",
    fontPreset: "sans",
    ink: "#E8EEF5",
    muted: "#8A94A3",
    line: "#252A35",
    surface: "#1A1E28",
    accentInk: "#12141A",
  },
  {
    id: "ember",
    label: "Ember",
    mode: "dark",
    background: "#1C1410",
    accent: "#D4784A",
    fontPreset: "display",
    ink: "#F5EBE3",
    muted: "#A08A7A",
    line: "#322820",
    surface: "#241C16",
    accentInk: "#1C1410",
  },
];

export const GALLERY_THEME_PRESETS: GalleryThemePreset[] = [
  {
    id: "echo",
    label: "Echo",
    mode: "light",
    sample: "ECHO",
    fontClass:
      "font-sans text-[10px] font-semibold uppercase tracking-[0.14em]",
    fontPreset: "sans",
    bg: "#F3F3F3",
    accent: "#1D1D1D",
    ink: "#1D1D1D",
    muted: "#6B6560",
    line: "#E0DCD6",
    surface: "#FAFAF8",
    accentInk: "#FAFAF8",
    layout: "split",
  },
  {
    id: "spring",
    label: "Spring",
    mode: "light",
    sample: "Spring",
    fontClass: "font-display text-[11px] tracking-wide",
    fontPreset: "display",
    bg: "#F7F1EA",
    accent: "#3D5A40",
    ink: "#2A2A2A",
    muted: "#5A6358",
    line: "#E8DFD2",
    surface: "#FBF7F1",
    accentInk: "#FBF7F1",
    layout: "vertical",
  },
  {
    id: "lark",
    label: "Lark",
    mode: "light",
    sample: "Lark",
    fontClass: "font-sans text-[11px] font-medium tracking-tight",
    fontPreset: "sans",
    bg: "#EEF2F6",
    accent: "#1F3A5F",
    ink: "#15202B",
    muted: "#5C6B7A",
    line: "#D8E0E8",
    surface: "#F7F9FB",
    accentInk: "#F7F9FB",
    layout: "split",
  },
  {
    id: "sage",
    label: "Sage",
    mode: "light",
    sample: "Sage",
    fontClass: "font-display text-[12px] font-light italic tracking-wide",
    fontPreset: "display",
    bg: "#F1F4EF",
    accent: "#4A5D4E",
    ink: "#222222",
    muted: "#5A6358",
    line: "#DCE2D8",
    surface: "#F8FAF7",
    accentInk: "#F8FAF7",
    layout: "centered",
  },
  {
    id: "dusk",
    label: "Dusk",
    mode: "dark",
    sample: "DUSK",
    fontClass:
      "font-sans text-[10px] font-semibold uppercase tracking-[0.14em]",
    fontPreset: "sans",
    bg: "#1A1A1A",
    accent: "#E8E4DE",
    ink: "#F0EDE8",
    muted: "#9A9590",
    line: "#2E2E2E",
    surface: "#222222",
    accentInk: "#1A1A1A",
    layout: "split",
  },
  {
    id: "obsidian",
    label: "Obsidian",
    mode: "dark",
    sample: "Obsidian",
    fontClass: "font-sans text-[11px] font-medium tracking-tight",
    fontPreset: "sans",
    bg: "#0F0F0F",
    accent: "#8BA4C7",
    ink: "#E8EEF5",
    muted: "#8A94A3",
    line: "#252525",
    surface: "#181818",
    accentInk: "#0F0F0F",
    layout: "split",
  },
  {
    id: "velvet",
    label: "Velvet",
    mode: "dark",
    sample: "Velvet",
    fontClass: "font-display text-[12px] font-light italic tracking-wide",
    fontPreset: "display",
    bg: "#141018",
    accent: "#C4A574",
    ink: "#F2EDE6",
    muted: "#8A837A",
    line: "#2A2430",
    surface: "#1C1822",
    accentInk: "#141018",
    layout: "centered",
  },
  {
    id: "ember",
    label: "Ember",
    mode: "dark",
    sample: "Ember",
    fontClass: "font-display text-[11px] tracking-wide",
    fontPreset: "display",
    bg: "#1C1410",
    accent: "#D4784A",
    ink: "#F5EBE3",
    muted: "#A08A7A",
    line: "#322820",
    surface: "#241C16",
    accentInk: "#1C1410",
    layout: "vertical",
  },
];

const GALLERY_BY_ID = Object.fromEntries(
  GALLERY_THEME_PRESETS.map((t) => [t.id, t]),
) as Record<GalleryThemeId, GalleryThemePreset>;

export function isGalleryThemeId(value: unknown): value is GalleryThemeId {
  return typeof value === "string" && value in GALLERY_BY_ID;
}

export function resolveGalleryTheme(
  themeId?: string | null,
): GalleryThemePreset {
  if (themeId && isGalleryThemeId(themeId)) return GALLERY_BY_ID[themeId];
  return GALLERY_BY_ID.echo;
}

export function resolveStudioThemePreset(
  theme?: {
    presetId?: string;
    background?: string;
    accent?: string;
    fontPreset?: string;
  } | null,
): StudioThemePreset {
  if (theme?.presetId) {
    const byId = STUDIO_THEME_PRESETS.find((p) => p.id === theme.presetId);
    if (byId) return byId;
  }
  if (theme?.background && theme?.accent) {
    const match = STUDIO_THEME_PRESETS.find(
      (p) =>
        p.background.toLowerCase() === theme.background!.toLowerCase() &&
        p.accent.toLowerCase() === theme.accent!.toLowerCase(),
    );
    if (match) return match;
  }
  return STUDIO_THEME_PRESETS[0]!;
}

export function studioThemeFromPreset(
  preset: StudioThemePreset,
  fontOverride?: FontPresetId | null,
): StudioTheme {
  return {
    presetId: preset.id,
    background: preset.background,
    accent: preset.accent,
    fontPreset: fontOverride || preset.fontPreset,
  };
}

/** Curated type pairings for Brand settings (AURA-228). */
export const FONT_PRESETS: {
  id: FontPresetId;
  label: string;
  detail: string;
  specimen: string;
}[] = [
  {
    id: "sans",
    label: "Sans",
    detail: "Clean sans for headlines and body",
    specimen: "Quiet clarity",
  },
  {
    id: "serif",
    label: "Serif",
    detail: "Editorial serif throughout",
    specimen: "Printed pages",
  },
  {
    id: "display",
    label: "Display",
    detail: "Serif headlines with sans body",
    specimen: "Studio voice",
  },
  {
    id: "editorial",
    label: "Editorial",
    detail: "Literary serif with quiet sans",
    specimen: "Long form",
  },
  {
    id: "modern",
    label: "Modern",
    detail: "Geometric display with clean sans",
    specimen: "Sharp lines",
  },
  {
    id: "soft",
    label: "Soft",
    detail: "Romantic serif with soft sans",
    specimen: "Warm light",
  },
];

const FONT_PRESET_IDS = new Set<string>(FONT_PRESETS.map((f) => f.id));

export function resolveFontPreset(
  value?: string | null,
): FontPresetId {
  return value && FONT_PRESET_IDS.has(value)
    ? (value as FontPresetId)
    : "sans";
}

const FONT_FIGTREE =
  "var(--font-figtree), 'Segoe UI', 'Helvetica Neue', sans-serif";
const FONT_FRAUNCES =
  "var(--font-fraunces), 'Iowan Old Style', Palatino, serif";
const FONT_NEWSREADER =
  "var(--font-newsreader), 'Iowan Old Style', Georgia, serif";
const FONT_DM_SANS =
  "var(--font-dm-sans), 'Segoe UI', 'Helvetica Neue', sans-serif";
const FONT_SYNE =
  "var(--font-syne), 'Segoe UI', 'Helvetica Neue', sans-serif";
const FONT_CORMORANT =
  "var(--font-cormorant), 'Palatino Linotype', Palatino, serif";

function fontPairVars(
  display: string,
  body: string,
): Record<string, string> {
  return {
    ["--font-display"]: display,
    ["--font-body"]: body,
    ["--font-sans"]: body,
  };
}

/** Switch `--font-display` / `--font-body` for public branded roots (AURA-213 / 228). */
export function fontPresetCssVars(
  preset?: FontPresetId | string | null,
): Record<string, string> {
  const id = resolveFontPreset(preset);

  switch (id) {
    case "sans":
      return fontPairVars(FONT_FIGTREE, FONT_FIGTREE);
    case "serif":
      return fontPairVars(FONT_FRAUNCES, FONT_FRAUNCES);
    case "display":
      return fontPairVars(FONT_FRAUNCES, FONT_FIGTREE);
    case "editorial":
      return fontPairVars(FONT_NEWSREADER, FONT_DM_SANS);
    case "modern":
      return fontPairVars(FONT_SYNE, FONT_DM_SANS);
    case "soft":
      return fontPairVars(FONT_CORMORANT, FONT_FIGTREE);
    default:
      return fontPairVars(FONT_FIGTREE, FONT_FIGTREE);
  }
}

/** CSS custom properties for public branded pages. */
export function studioThemeCssVars(
  preset: StudioThemePreset,
  overrides?: { fontPreset?: FontPresetId | string | null },
): Record<string, string> {
  return {
    background: preset.background,
    color: preset.ink,
    ["--canvas"]: preset.background,
    ["--surface"]: preset.surface,
    ["--surface-elevated"]: preset.surface,
    ["--ink"]: preset.ink,
    ["--muted"]: preset.muted,
    ["--line"]: preset.line,
    ["--accent"]: preset.accent,
    ["--accent-ink"]: preset.accentInk,
    ["--focus"]: preset.accent,
    /* Scrim/on-media stay dark/light for photo overlays — not remapped to text ink */
    ["--scrim"]: "rgb(12 10 8 / 0.55)",
    ["--scrim-strong"]: "rgb(12 10 8 / 0.92)",
    ["--on-media"]: "#fffdf8",
    ["--on-media-muted"]: "rgb(255 253 248 / 0.72)",
    ...fontPresetCssVars(overrides?.fontPreset ?? preset.fontPreset),
    ["--color-canvas"]: preset.background,
    ["--color-surface"]: preset.surface,
    ["--color-surface-elevated"]: preset.surface,
    ["--color-ink"]: preset.ink,
    ["--color-muted"]: preset.muted,
    ["--color-line"]: preset.line,
    ["--color-accent"]: preset.accent,
    ["--color-accent-ink"]: preset.accentInk,
    ["--color-focus"]: preset.accent,
    ["--color-scrim"]: "rgb(12 10 8 / 0.55)",
    ["--color-scrim-strong"]: "rgb(12 10 8 / 0.92)",
    ["--color-on-media"]: "#fffdf8",
    ["--color-on-media-muted"]: "rgb(255 253 248 / 0.72)",
  };
}

export function galleryThemeCssVars(
  theme: GalleryThemePreset,
  overrides?: { background?: string; accent?: string },
): Record<string, string> {
  const bg = overrides?.background || theme.bg;
  const accent = overrides?.accent || theme.accent;
  const accentInk = theme.accentInk;
  const surfaceElevated =
    theme.mode === "dark" ? theme.surface : "#ffffff";
  return {
    background: bg,
    color: theme.ink,
    ["--gallery-page-bg"]: bg,
    ["--canvas"]: bg,
    ["--surface"]: theme.surface,
    ["--surface-elevated"]: surfaceElevated,
    ["--ink"]: theme.ink,
    ["--muted"]: theme.muted,
    ["--line"]: theme.line,
    ["--accent"]: accent,
    ["--accent-ink"]: accentInk,
    ["--focus"]: accent,
    ["--scrim"]: "rgb(12 10 8 / 0.55)",
    ["--scrim-strong"]: "rgb(12 10 8 / 0.92)",
    ["--on-media"]: "#fffdf8",
    ["--on-media-muted"]: "rgb(255 253 248 / 0.72)",
    ...fontPresetCssVars(theme.fontPreset),
    ["--color-canvas"]: bg,
    ["--color-surface"]: theme.surface,
    ["--color-surface-elevated"]: surfaceElevated,
    ["--color-ink"]: theme.ink,
    ["--color-muted"]: theme.muted,
    ["--color-line"]: theme.line,
    ["--color-accent"]: accent,
    ["--color-accent-ink"]: accentInk,
    ["--color-focus"]: accent,
    ["--color-scrim"]: "rgb(12 10 8 / 0.55)",
    ["--color-scrim-strong"]: "rgb(12 10 8 / 0.92)",
    ["--color-on-media"]: "#fffdf8",
    ["--color-on-media-muted"]: "rgb(255 253 248 / 0.72)",
  };
}
