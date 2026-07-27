"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { GalleryGridMode } from "@/lib/types";

export type MasonryPhoto = {
  id: string;
  url: string;
  thumbUrl?: string;
  aspect?: number;
  kind?: string;
  videoUrl?: string;
};

export function MasonryGrid({
  photos,
  onPhotoClick,
  renderOverlay,
  className,
  gridMode = "masonry",
  hoverActions,
}: {
  photos: MasonryPhoto[];
  onPhotoClick?: (photo: MasonryPhoto) => void;
  renderOverlay?: (photo: MasonryPhoto) => ReactNode;
  className?: string;
  gridMode?: GalleryGridMode;
  /** Sleek hover bar (favorite / download) — Pixieset-style */
  hoverActions?: (photo: MasonryPhoto) => ReactNode;
}) {
  const layout =
    gridMode === "columns"
      ? "grid grid-cols-2 gap-0.5 sm:grid-cols-3 lg:grid-cols-4"
      : gridMode === "justified"
        ? "flex flex-wrap gap-0.5"
        : "columns-2 gap-0.5 sm:columns-3 lg:columns-4 xl:columns-5 [column-fill:balance]";

  return (
    <div className={cn(layout, "gallery-grid-enter", className)}>
      {photos.map((photo, i) => (
        <div
          key={photo.id}
          className={cn(
            "group relative break-inside-avoid overflow-hidden bg-transparent",
            gridMode === "masonry" ? "mb-0.5" : "",
            gridMode === "justified"
              ? "h-40 grow basis-[140px] sm:h-52 sm:basis-[180px]"
              : "",
          )}
          style={{ animationDelay: `${Math.min(i, 12) * 40}ms` }}
        >
          <button
            type="button"
            onClick={() => onPhotoClick?.(photo)}
            className="block w-full text-left"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.thumbUrl || photo.url}
              alt=""
              loading="lazy"
              className={cn(
                "block w-full object-cover transition duration-500 ease-out group-hover:scale-[1.02]",
                gridMode === "justified" ? "h-full" : "h-auto",
                gridMode === "columns" ? "aspect-[4/5]" : "",
              )}
              style={
                photo.aspect && gridMode === "masonry"
                  ? { aspectRatio: String(photo.aspect) }
                  : undefined
              }
            />
            {photo.kind === "video" || photo.videoUrl ? (
              <span className="absolute bottom-2 left-2 bg-ink/70 px-2 py-0.5 text-[10px] uppercase tracking-wider text-surface">
                Video
              </span>
            ) : null}
          </button>

          {hoverActions ? (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center bg-gradient-to-t from-ink/55 to-transparent px-2 pb-2.5 pt-10 opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-within:opacity-100">
              <div className="pointer-events-auto flex items-center gap-1 rounded-sm bg-surface/95 px-1.5 py-1 shadow-sm">
                {hoverActions(photo)}
              </div>
            </div>
          ) : null}

          {renderOverlay ? (
            <div className="pointer-events-none absolute inset-0 flex items-start justify-end p-2 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
              <div className="pointer-events-auto">{renderOverlay(photo)}</div>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
