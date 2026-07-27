"use client";

import type { ReactNode } from "react";
import { MasonryGrid, type MasonryPhoto } from "@/components/gallery/MasonryGrid";
import { Button } from "@/components/ui";

export function AlbumView({
  title,
  subtitle,
  photos,
  onBack,
  onPhotoClick,
  renderOverlay,
  actions,
  emptyMessage,
}: {
  title: string;
  subtitle?: string;
  photos: MasonryPhoto[];
  onBack?: () => void;
  onPhotoClick?: (photo: MasonryPhoto) => void;
  renderOverlay?: (photo: MasonryPhoto) => ReactNode;
  actions?: ReactNode;
  emptyMessage?: string;
}) {
  const showHeader = Boolean(title || onBack || actions || subtitle);
  return (
    <div className={showHeader ? "min-h-full bg-canvas text-ink" : undefined}>
      {showHeader ? (
        <header className="sticky top-0 z-20 border-b border-line bg-canvas/95 backdrop-blur">
          <div className="shell-pad mx-auto flex max-w-[var(--shell-max)] flex-wrap items-center justify-between gap-3 py-3">
            <div>
              {onBack ? (
                <button
                  type="button"
                  className="text-sm text-muted hover:text-ink"
                  onClick={onBack}
                >
                  ← Back
                </button>
              ) : null}
              {title ? (
                <h1 className="font-display text-2xl sm:text-3xl">{title}</h1>
              ) : null}
              {subtitle ? (
                <p className="text-sm text-muted">{subtitle}</p>
              ) : null}
            </div>
            {actions ? (
              <div className="flex flex-wrap gap-2">{actions}</div>
            ) : null}
          </div>
        </header>
      ) : null}

      <main
        className={
          showHeader
            ? "shell-pad mx-auto max-w-[var(--shell-max)] py-6"
            : undefined
        }
      >
        {photos.length === 0 ? (
          <p className="py-16 text-center text-muted">
            {emptyMessage || "No photos in this album yet."}
          </p>
        ) : (
          <MasonryGrid
            photos={photos}
            onPhotoClick={onPhotoClick}
            renderOverlay={renderOverlay}
          />
        )}
      </main>
    </div>
  );
}

export function AlbumShareButton({
  onShare,
  label = "Share",
}: {
  onShare: () => void;
  label?: string;
}) {
  return (
    <Button size="sm" tone="ghost" onClick={onShare}>
      {label}
    </Button>
  );
}
