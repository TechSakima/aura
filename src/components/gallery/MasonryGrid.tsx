"use client";

import { useState, type ReactNode } from "react";
import { MediaGrid } from "@/components/media/MediaGrid";
import { cn } from "@/lib/cn";
import { isPlaceholderAspect } from "@/lib/images/dimensions";
import {
  galleryGridToMediaMode,
  type MediaGridMode,
} from "@/lib/media-grid";
import type { GalleryGridMode } from "@/lib/types";

export type MasonryPhoto = {
  id: string;
  url: string;
  thumbUrl?: string;
  aspect?: number;
  kind?: string;
  videoUrl?: string;
  /** Original upload name for lightbox caption (AURA-253). */
  filename?: string;
};

function MasonryTile({
  photo,
  index,
  total,
  mode,
  onPhotoClick,
  hoverActions,
  renderOverlay,
  itemClassName,
  animationDelay,
}: {
  photo: MasonryPhoto;
  index: number;
  total: number;
  mode: MediaGridMode;
  onPhotoClick?: (photo: MasonryPhoto) => void;
  hoverActions?: (photo: MasonryPhoto) => ReactNode;
  renderOverlay?: (photo: MasonryPhoto) => ReactNode;
  itemClassName: string;
  animationDelay: string;
}) {
  const [naturalAspect, setNaturalAspect] = useState<number | null>(null);
  const storedAspect = isPlaceholderAspect(photo.aspect)
    ? null
    : photo.aspect;
  const aspect = storedAspect ?? naturalAspect ?? undefined;
  const name = photo.filename?.trim().split(/[/\\]/).pop();
  const isVideo = Boolean(photo.kind === "video" || photo.videoUrl);
  const openLabel = [
    isVideo ? "Open video" : "Open photo",
    name || `${index + 1} of ${total}`,
  ].join(", ");

  return (
    <div
      className={cn(
        "group relative overflow-hidden bg-transparent",
        itemClassName,
        mode === "diary" && "break-inside-avoid",
      )}
      style={{ animationDelay }}
    >
      <button
        type="button"
        onClick={() => onPhotoClick?.(photo)}
        aria-label={openLabel}
        className="block w-full min-h-11 text-left"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.thumbUrl || photo.url}
          alt=""
          loading="lazy"
          decoding="async"
          className={cn(
            "block w-full object-cover transition duration-emphasis ease-out group-hover:scale-[1.01]",
            mode === "justified" ? "h-full" : "h-auto",
            mode === "columns" ? "aspect-[4/5]" : "",
            mode === "diary" ? "aspect-[3/4] sm:aspect-[4/5]" : "",
          )}
          style={
            aspect && mode === "masonry"
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
          <span className="absolute bottom-2 left-2 bg-scrim px-2 py-0.5 text-[10px] uppercase tracking-wider text-on-media">
            Video
          </span>
        ) : null}
        {photo.kind === "video" ? (
          <span className="absolute bottom-2 right-2 bg-scrim px-2 py-0.5 text-[10px] text-on-media-muted">
            Download via single
          </span>
        ) : null}
      </button>

      {hoverActions ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/50 to-transparent px-2 pb-2.5 pt-12 opacity-100 transition-all duration-base sm:translate-y-1 sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100 sm:group-focus-within:translate-y-0 sm:group-focus-within:opacity-100">
          <div className="pointer-events-auto mx-auto flex w-fit max-w-full items-center overflow-hidden rounded-sm bg-surface shadow-sm">
            {hoverActions(photo)}
          </div>
        </div>
      ) : null}

      {renderOverlay ? (
        <div className="pointer-events-none absolute inset-0 flex items-start justify-end p-2 opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
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
  enter,
  staggerMs,
}: {
  photos: MasonryPhoto[];
  onPhotoClick?: (photo: MasonryPhoto) => void;
  renderOverlay?: (photo: MasonryPhoto) => ReactNode;
  className?: string;
  gridMode?: GalleryGridMode;
  hoverActions?: (photo: MasonryPhoto) => ReactNode;
  enter?: boolean;
  staggerMs?: number;
}) {
  const mode = galleryGridToMediaMode(gridMode);

  return (
    <MediaGrid
      mode={mode}
      items={photos}
      getKey={(p) => p.id}
      className={className}
      enter={enter}
      staggerMs={staggerMs}
      renderItem={(photo, ctx) => (
        <MasonryTile
          photo={photo}
          index={ctx.index}
          total={photos.length}
          mode={ctx.mode}
          onPhotoClick={onPhotoClick}
          hoverActions={hoverActions}
          renderOverlay={renderOverlay}
          itemClassName={ctx.itemClassName}
          animationDelay={ctx.animationDelay}
        />
      )}
    />
  );
}
