"use client";

import { cn } from "@/lib/cn";
import type { GalleryThemePreset, StudioThemePreset } from "@/lib/themes";

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
      ? (coverPhotoUrl
          ? `linear-gradient(to top, rgba(0,0,0,.55), rgba(0,0,0,.2)), center/cover url(${coverPhotoUrl})`
          : bg)
      : bg;
  const showAa = !("sample" in theme);

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
        className="mb-2 flex h-14 items-center justify-center"
        style={{
          background: sample,
          color: coverPhotoUrl ? "#faf8f5" : theme.ink,
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
          <span
            className={cn("fontClass" in theme && theme.fontClass)}
            style={{ color: coverPhotoUrl ? "#faf8f5" : theme.ink }}
          >
            {"sample" in theme ? theme.sample : ""}
          </span>
        )}
      </span>
      <span className="text-[11px] uppercase tracking-wider">{theme.label}</span>
    </button>
  );
}
