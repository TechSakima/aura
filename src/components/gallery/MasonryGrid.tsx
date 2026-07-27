"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { isPlaceholderAspect } from "@/lib/images/dimensions";
import type { GalleryGridMode } from "@/lib/types";

export type MasonryPhoto = {
  id: string;
  url: string;
  thumbUrl?: string;
  aspect?: number;
  kind?: string;
  videoUrl?: string;
};

function MasonryTile({
  photo,
  gridMode,
  onPhotoClick,
  hoverActions,
  renderOverlay,
  animationDelay,
}: {
  photo: MasonryPhoto;
  gridMode: GalleryGridMode;
  onPhotoClick?: (photo: MasonryPhoto) => void;
  hoverActions?: (photo: MasonryPhoto) => ReactNode;
  renderOverlay?: (photo: MasonryPhoto) => ReactNode;
  animationDelay: string;
}) {
  const [naturalAspect, setNaturalAspect] = useState<number | null>(null);
  const storedAspect = isPlaceholderAspect(photo.aspect)
    ? null
    : photo.aspect;
  const aspect = storedAspect ?? naturalAspect ?? undefined;

  return (
    <div
      className={cn(
        "group relative break-inside-avoid overflow-hidden bg-transparent",
        gridMode === "masonry" ? "mb-0.5" : "",
        gridMode === "justified"
          ? "h-40 grow basis-[140px] sm:h-52 sm:basis-[180px]"
          : "",
      )}
      style={{ animationDelay }}
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
          decoding="async"
          className={cn(
            "block w-full object-cover transition duration-500 ease-out group-hover:scale-[1.01]",
            gridMode === "justified" ? "h-full" : "h-auto",
            gridMode === "columns" ? "aspect-[4/5]" : "",
          )}
          style={
            aspect && gridMode === "masonry"
              ? { aspectRatio: String(aspect) }
              : undefined
          }
          onLoad={(e) => {
            if (storedAspect) return;
            const img = e.currentTarget;
            if (img.naturalWidth > 0 && img.naturalHeight > 0) {
              setNaturalAspect(img.naturalWidth / img.naturalHeight);
            }
          }}
        />
        {photo.kind === "video" || photo.videoUrl ? (
          <span className="absolute bottom-2 left-2 bg-ink/70 px-2 py-0.5 text-[10px] uppercase tracking-wider text-surface">
            Video
          </span>
        ) : null}
      </button>

      {hoverActions ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-1 bg-gradient-to-t from-ink/50 to-transparent px-2 pb-2.5 pt-12 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100">
          <div className="pointer-events-auto mx-auto flex w-fit max-w-full items-center overflow-hidden rounded-sm bg-surface shadow-sm">
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
  );
}

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
        <MasonryTile
          key={photo.id}
          photo={photo}
          gridMode={gridMode}
          onPhotoClick={onPhotoClick}
          hoverActions={hoverActions}
          renderOverlay={renderOverlay}
          animationDelay={`${Math.min(i, 12) * 40}ms`}
        />
      ))}
    </div>
  );
}
