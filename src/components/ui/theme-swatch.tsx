"use client";

import { cn } from "@/lib/cn";
import type { GalleryThemePreset, StudioThemePreset } from "@/lib/themes";

/** Cover preview scrim — token-based (AURA-458). */
const COVER_SCRIM =
  "linear-gradient(to top, var(--scrim), color-mix(in srgb, var(--scrim) 35%, transparent))";

/** Theme picker swatch — studio presets and gallery themes (AURA-204). */
export function ThemeSwatch({
  theme,
  selected,
  coverPhotoUrl,
  onSelect,
}: {
  theme: StudioThemePreset | GalleryThemePreset;
  selected: boolean;
  coverPhotoUrl?: string;
  onSelect: () => void;
}) {
  const bg = "background" in theme ? theme.background : theme.bg;
  const sample =
    "sample" in theme
      ? coverPhotoUrl
        ? `${COVER_SCRIM}, center/cover url(${coverPhotoUrl})`
        : bg
      : bg;
  const showAa = !("sample" in theme);
  const onCover = Boolean(coverPhotoUrl);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "border p-2 text-left transition",
        selected
          ? "border-accent ring-1 ring-accent"
          : "border-line hover:border-ink/30",
      )}
    >
      <span
        className={cn(
          "mb-2 flex h-14 items-center justify-center",
          onCover && "text-on-media",
        )}
        style={{
          background: sample,
          color: onCover ? undefined : theme.ink,
          borderBottom: `3px solid ${theme.accent}`,
        }}
      >
        {showAa ? (
          <span className="flex h-full w-full items-end justify-between px-2 pb-2">
            <span className="text-[10px] font-medium uppercase tracking-wider">
              Aa
            </span>
            <span className="size-3" style={{ background: theme.accent }} />
          </span>
        ) : (
          <span className={cn("fontClass" in theme && theme.fontClass)}>
            {"sample" in theme ? theme.sample : ""}
          </span>
        )}
      </span>
      <span className="text-[11px] uppercase tracking-wider">{theme.label}</span>
    </button>
  );
}
