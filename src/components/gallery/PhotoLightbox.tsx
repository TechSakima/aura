"use client";

import { useEffect, useMemo, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { MasonryPhoto } from "@/components/gallery/MasonryGrid";

export function PhotoLightbox({
  photos,
  index,
  onIndexChange,
  onClose,
  footer,
}: {
  photos: MasonryPhoto[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  footer?: ReactNode;
}) {
  const photo = photos[index] || null;
  const hasPrev = index > 0;
  const hasNext = index < photos.length - 1;
  const label = useMemo(
    () => (photos.length ? `${index + 1} / ${photos.length}` : ""),
    [index, photos.length],
  );

  useEffect(() => {
    if (!photo) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && hasPrev) onIndexChange(index - 1);
      if (e.key === "ArrowRight" && hasNext) onIndexChange(index + 1);
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [photo, hasPrev, hasNext, index, onClose, onIndexChange]);

  if (!photo) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-ink/95 text-surface"
      role="dialog"
      aria-modal="true"
      aria-label="Photo viewer"
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <p className="text-sm text-surface/70">{label}</p>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md px-3 py-1.5 text-sm text-surface/80 hover:bg-surface/10 hover:text-surface"
        >
          Close
        </button>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center px-12 sm:px-16">
        {hasPrev ? (
          <button
            type="button"
            aria-label="Previous photo"
            className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-surface/10 px-3 py-2 text-lg hover:bg-surface/20 sm:left-4"
            onClick={() => onIndexChange(index - 1)}
          >
            ‹
          </button>
        ) : null}
        {hasNext ? (
          <button
            type="button"
            aria-label="Next photo"
            className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-surface/10 px-3 py-2 text-lg hover:bg-surface/20 sm:right-4"
            onClick={() => onIndexChange(index + 1)}
          >
            ›
          </button>
        ) : null}

        {photo.kind === "video" || photo.videoUrl ? (
          <video
            key={photo.id}
            src={photo.videoUrl || photo.url}
            controls
            playsInline
            className="max-h-full max-w-full animate-enter"
          />
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            key={photo.id}
            src={photo.url}
            alt=""
            className="max-h-full max-w-full object-contain animate-enter"
          />
        )}
      </div>

      {footer ? (
        <div className="border-t border-surface/15 px-4 py-3 sm:px-6">{footer}</div>
      ) : null}

      {/* Tap outside image area on mobile: backdrop click via edges */}
      <button
        type="button"
        aria-label="Close viewer"
        className={cn("sr-only")}
        onClick={onClose}
      />
    </div>
  );
}
