import type { GalleryGridMode, HomepageCollectionsLayout } from "@/lib/types";

/** Shared photo/collection grid modes (AURA-246). */
export type MediaGridMode = "masonry" | "justified" | "columns" | "diary";

export const MEDIA_GRID_MODES: { id: MediaGridMode; label: string }[] = [
  { id: "masonry", label: "Masonry" },
  { id: "justified", label: "Justified" },
  { id: "columns", label: "Columns" },
  { id: "diary", label: "Diary" },
];

const MODE_SET = new Set<string>(MEDIA_GRID_MODES.map((m) => m.id));

export function isMediaGridMode(value: unknown): value is MediaGridMode {
  return typeof value === "string" && MODE_SET.has(value);
}

export function asMediaGridMode(
  value: unknown,
  fallback: MediaGridMode = "masonry",
): MediaGridMode {
  return isMediaGridMode(value) ? value : fallback;
}

/** Gallery design grid mode ↔ shared engine. */
export function galleryGridToMediaMode(mode: GalleryGridMode): MediaGridMode {
  return asMediaGridMode(mode);
}

/**
 * Homepage collections → shared engine.
 * `grid` aliases columns; list/cinematic stay homepage-specific.
 */
export function homepageLayoutToMediaMode(
  layout: HomepageCollectionsLayout,
): MediaGridMode | null {
  if (layout === "list" || layout === "cinematic") return null;
  if (layout === "grid") return "columns";
  return asMediaGridMode(layout);
}

/** Gaps use `--gallery-grid-gap` / diary vars from density (AURA-252). */
export function mediaGridContainerClass(mode: MediaGridMode): string {
  switch (mode) {
    case "columns":
      /* @* breakpoints — DeviceFramePreview + PublicShell size containers (AURA-439). */
      return "grid grid-cols-2 gap-[var(--gallery-grid-gap,0.125rem)] @sm:grid-cols-3 @lg:grid-cols-4";
    case "justified":
      return "flex min-w-0 flex-wrap gap-[var(--gallery-grid-gap,0.125rem)]";
    case "diary":
      /* Pad + safe-area; @sm keeps insets only so diary can go edge-to-edge (AURA-454). */
      return "gallery-pad-x mx-auto flex w-full max-w-3xl flex-col gap-[var(--gallery-diary-gap,2rem)] @sm:pl-[var(--safe-inset-left)] @sm:pr-[var(--safe-inset-right)]";
    case "masonry":
    default:
      return "columns-2 gap-[var(--gallery-grid-gap,0.125rem)] @sm:columns-3 @lg:columns-4 @xl:columns-5 [column-fill:balance]";
  }
}

export function mediaGridItemClass(mode: MediaGridMode): string {
  switch (mode) {
    case "justified":
      return "h-40 min-w-0 grow basis-[min(140px,100%)] @sm:h-52 @sm:basis-[180px]";
    case "diary":
      return "w-full";
    case "columns":
      return "min-w-0";
    case "masonry":
    default:
      return "mb-[var(--gallery-grid-gap,0.125rem)] break-inside-avoid";
  }
}

/** Enter animation class — durations from tokens (`--duration-enter`). */
export const MEDIA_GRID_ENTER_CLASS = "media-grid-enter";
