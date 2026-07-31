import {
  resolveStudioThemePreset,
  STUDIO_THEME_PRESETS,
  type StudioThemePreset,
} from "@/lib/themes";
import type { StudioTheme } from "@/lib/types";

/**
 * Transactional email shell colors (AURA-144).
 *
 * Decision: keep a **light** canvas always (email clients handle dark HTML
 * poorly). Brand via studio **accent** on CTAs/links. Light presets also tint
 * page/chrome from the kit; dark presets fall back to Linen for shell text/bg.
 */
export type EmailShellColors = {
  pageBg: string;
  cardBg: string;
  ink: string;
  muted: string;
  body: string;
  line: string;
  accent: string;
  accentInk: string;
};

const LINEN: StudioThemePreset =
  STUDIO_THEME_PRESETS.find((p) => p.id === "linen") ?? STUDIO_THEME_PRESETS[0]!;

/** Allow only #RGB / #RRGGBB for inline styles. */
export function safeCssHex(value: string | undefined, fallback: string): string {
  const v = (value || "").trim();
  if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v)) return v;
  return fallback;
}

export function emailShellColors(
  theme?: StudioTheme | null,
): EmailShellColors {
  const preset = resolveStudioThemePreset(theme);
  const shell = preset.mode === "dark" ? LINEN : preset;
  const accent = safeCssHex(preset.accent, LINEN.accent);
  const accentInk = safeCssHex(preset.accentInk, LINEN.accentInk);
  return {
    pageBg: safeCssHex(shell.background, LINEN.background),
    cardBg: "#ffffff",
    ink: safeCssHex(shell.ink, LINEN.ink),
    muted: safeCssHex(shell.muted, LINEN.muted),
    body: safeCssHex(shell.ink, LINEN.ink),
    line: safeCssHex(shell.line, LINEN.line),
    accent,
    accentInk,
  };
}
