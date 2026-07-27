import type { FontPresetId, GalleryThemeId, StudioTheme } from "@/lib/types";

export type ThemeMode = "light" | "dark";

export type StudioThemePreset = {
  id: string;
  label: string;
  mode: ThemeMode;
  background: string;
  accent: string;
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
  bg: string;
  accent: string;
  ink: string;
  muted: string;
  line: string;
  surface: string;
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
    muted: "#7A6E64",
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
    muted: "#6A7368",
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
    bg: "#F3F3F3",
    accent: "#1D1D1D",
    ink: "#1D1D1D",
    muted: "#6B6560",
    line: "#E0DCD6",
    surface: "#FAFAF8",
    layout: "split",
  },
  {
    id: "spring",
    label: "Spring",
    mode: "light",
    sample: "Spring",
    fontClass: "font-display text-[11px] tracking-wide",
    bg: "#F7F1EA",
    accent: "#3D5A40",
    ink: "#2A2A2A",
    muted: "#6A7368",
    line: "#E8DFD2",
    surface: "#FBF7F1",
    layout: "vertical",
  },
  {
    id: "lark",
    label: "Lark",
    mode: "light",
    sample: "Lark",
    fontClass: "font-sans text-[11px] font-medium tracking-tight",
    bg: "#EEF2F6",
    accent: "#1F3A5F",
    ink: "#15202B",
    muted: "#5C6B7A",
    line: "#D8E0E8",
    surface: "#F7F9FB",
    layout: "split",
  },
  {
    id: "sage",
    label: "Sage",
    mode: "light",
    sample: "Sage",
    fontClass: "font-display text-[12px] font-light italic tracking-wide",
    bg: "#F1F4EF",
    accent: "#4A5D4E",
    ink: "#222222",
    muted: "#6A7368",
    line: "#DCE2D8",
    surface: "#F8FAF7",
    layout: "centered",
  },
  {
    id: "dusk",
    label: "Dusk",
    mode: "dark",
    sample: "DUSK",
    fontClass:
      "font-sans text-[10px] font-semibold uppercase tracking-[0.14em]",
    bg: "#1A1A1A",
    accent: "#E8E4DE",
    ink: "#F0EDE8",
    muted: "#9A9590",
    line: "#2E2E2E",
    surface: "#222222",
    layout: "split",
  },
  {
    id: "obsidian",
    label: "Obsidian",
    mode: "dark",
    sample: "Obsidian",
    fontClass: "font-sans text-[11px] font-medium tracking-tight",
    bg: "#0F0F0F",
    accent: "#8BA4C7",
    ink: "#E8EEF5",
    muted: "#8A94A3",
    line: "#252525",
    surface: "#181818",
    layout: "split",
  },
  {
    id: "velvet",
    label: "Velvet",
    mode: "dark",
    sample: "Velvet",
    fontClass: "font-display text-[12px] font-light italic tracking-wide",
    bg: "#141018",
    accent: "#C4A574",
    ink: "#F2EDE6",
    muted: "#8A837A",
    line: "#2A2430",
    surface: "#1C1822",
    layout: "centered",
  },
  {
    id: "ember",
    label: "Ember",
    mode: "dark",
    sample: "Ember",
    fontClass: "font-display text-[11px] tracking-wide",
    bg: "#1C1410",
    accent: "#D4784A",
    ink: "#F5EBE3",
    muted: "#A08A7A",
    line: "#322820",
    surface: "#241C16",
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

export function studioThemeFromPreset(preset: StudioThemePreset): StudioTheme {
  return {
    presetId: preset.id,
    background: preset.background,
    accent: preset.accent,
    fontPreset: preset.fontPreset,
  };
}

/** CSS custom properties for public branded pages. */
export function studioThemeCssVars(
  preset: StudioThemePreset,
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
    ["--color-canvas"]: preset.background,
    ["--color-surface"]: preset.surface,
    ["--color-surface-elevated"]: preset.surface,
    ["--color-ink"]: preset.ink,
    ["--color-muted"]: preset.muted,
    ["--color-line"]: preset.line,
    ["--color-accent"]: preset.accent,
    ["--color-accent-ink"]: preset.accentInk,
  };
}

export function galleryThemeCssVars(
  theme: GalleryThemePreset,
  overrides?: { background?: string; accent?: string },
): Record<string, string> {
  const bg = overrides?.background || theme.bg;
  const accent = overrides?.accent || theme.accent;
  return {
    background: bg,
    color: theme.ink,
    ["--gallery-page-bg"]: bg,
    ["--canvas"]: bg,
    ["--surface"]: theme.surface,
    ["--ink"]: theme.ink,
    ["--muted"]: theme.muted,
    ["--line"]: theme.line,
    ["--accent"]: accent,
    ["--color-canvas"]: bg,
    ["--color-surface"]: theme.surface,
    ["--color-ink"]: theme.ink,
    ["--color-muted"]: theme.muted,
    ["--color-line"]: theme.line,
    ["--color-accent"]: accent,
  };
}
