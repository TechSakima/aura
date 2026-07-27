"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

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
}: {
  photos: MasonryPhoto[];
  onPhotoClick?: (photo: MasonryPhoto) => void;
  renderOverlay?: (photo: MasonryPhoto) => ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "columns-2 gap-3 sm:columns-3 lg:columns-4 [column-fill:balance]",
        className,
      )}
    >
      {photos.map((photo) => (
        <div
          key={photo.id}
          className="group relative mb-3 break-inside-avoid overflow-hidden rounded-md border border-line bg-surface"
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
              className="block h-auto w-full object-cover transition-transform duration-500 group-hover:scale-[1.015]"
              style={
                photo.aspect
                  ? { aspectRatio: String(photo.aspect) }
                  : undefined
              }
            />
            {photo.kind === "video" || photo.videoUrl ? (
              <span className="absolute bottom-2 left-2 rounded bg-ink/70 px-2 py-0.5 text-xs text-surface">
                ▶ Video
              </span>
            ) : null}
          </button>
          {renderOverlay ? (
            <div className="pointer-events-none absolute inset-0 flex items-start justify-end p-2">
              <div className="pointer-events-auto">{renderOverlay(photo)}</div>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
