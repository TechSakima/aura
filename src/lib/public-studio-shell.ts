import type { CSSProperties } from "react";
import {
  resolveStudioThemePreset,
  studioThemeCssVars,
} from "@/lib/themes";
import type { StudioTheme } from "@/lib/types";

/** PublicShell brand props from API `studio.theme` (AURA-452). */
export function publicStudioShellProps(theme: StudioTheme | null | undefined): {
  style?: CSSProperties;
  fontPreset?: StudioTheme["fontPreset"];
} {
  if (!theme) return {};
  const preset = resolveStudioThemePreset(theme);
  return {
    style: studioThemeCssVars(preset, {
      fontPreset: theme.fontPreset,
    }) as CSSProperties,
    fontPreset: theme.fontPreset,
  };
}
