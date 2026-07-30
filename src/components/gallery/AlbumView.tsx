"use client";

import type { ReactNode } from "react";
import { MasonryGrid, type MasonryPhoto } from "@/components/gallery/MasonryGrid";
import { Button, ButtonLink } from "@/components/ui";

export function AlbumView({
  title,
  subtitle,
  photos,
  onBack,
  backHref,
  backLabel = "All albums",
  onPhotoClick,
  renderOverlay,
  actions,
  emptyMessage,
  /** When another sticky bar is above (gallery chrome), do not double-stick. */
  stickyHeader = true,
  headerExtra,
  enter,
  staggerMs,
}: {
  title: string;
  subtitle?: string;
  photos: MasonryPhoto[];
  onBack?: () => void;
  /** Prefer for public album routes (AURA-247). */
  backHref?: string;
  backLabel?: string;
  onPhotoClick?: (photo: MasonryPhoto) => void;
  renderOverlay?: (photo: MasonryPhoto) => ReactNode;
  actions?: ReactNode;
  emptyMessage?: string;
  stickyHeader?: boolean;
  /** e.g. AlbumNav under the title row */
  headerExtra?: ReactNode;
  enter?: boolean;
  staggerMs?: number;
}) {
  const showHeader = Boolean(
    title || onBack || backHref || actions || subtitle || headerExtra,
  );
  const backControl = backHref ? (
    <ButtonLink href={backHref} tone="ghost" size="sm" className="min-h-11 px-0">
      ← {backLabel}
    </ButtonLink>
  ) : onBack ? (
    <Button tone="ghost" size="sm" className="min-h-11 px-0" onClick={onBack}>
      ← {backLabel}
    </Button>
  ) : null;

  return (
    <div className={showHeader ? "min-h-full bg-canvas text-ink" : undefined}>
      {showHeader ? (
        <header
          className={
            stickyHeader
              ? "sticky top-0 z-20 border-b border-line bg-canvas/95 pt-[env(safe-area-inset-top)] backdrop-blur"
              : "border-b border-line bg-canvas/95 pt-[env(safe-area-inset-top)]"
          }
        >
          <div className="shell-pad mx-auto flex max-w-[var(--public-max)] flex-wrap items-center justify-between gap-3 py-3">
            <div className="min-w-0">
              {backControl}
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
          {headerExtra}
        </header>
      ) : null}

      <main
        className={
          showHeader
            ? "shell-pad mx-auto max-w-[var(--public-max)] py-6"
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
            enter={enter}
            staggerMs={staggerMs}
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
