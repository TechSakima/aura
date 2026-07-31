"use client";

import type { ReactNode } from "react";
import { MasonryGrid, type MasonryPhoto } from "@/components/gallery/MasonryGrid";
import {
  ActionStack,
  type ActionStackItem,
  Button,
  ButtonLink,
} from "@/components/ui";

export type { ActionStackItem as AlbumActionItem };

export function AlbumView({
  title,
  subtitle,
  photos,
  onBack,
  backHref,
  backLabel = "All albums",
  onPhotoClick,
  renderOverlay,
  /** Structured actions — primary + More on phone (AURA-436). */
  actionItems,
  primaryActionId,
  menuActionIds,
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
  actionItems?: ActionStackItem[];
  primaryActionId?: string;
  menuActionIds?: string[];
  emptyMessage?: string;
  stickyHeader?: boolean;
  /** e.g. AlbumNav under the title row */
  headerExtra?: ReactNode;
  enter?: boolean;
  staggerMs?: number;
}) {
  const items = (actionItems || []).filter(Boolean);
  const showHeader = Boolean(
    title || onBack || backHref || items.length || subtitle || headerExtra,
  );
  const backControl = backHref ? (
    <ButtonLink
      href={backHref}
      tone="ghost"
      size="sm"
      className="min-h-11 px-0"
      aria-label={backLabel}
    >
      <span className="sm:hidden">←</span>
      <span className="hidden sm:inline">← {backLabel}</span>
    </ButtonLink>
  ) : onBack ? (
    <Button
      tone="ghost"
      size="sm"
      className="min-h-11 px-0"
      onClick={onBack}
      aria-label={backLabel}
    >
      <span className="sm:hidden">←</span>
      <span className="hidden sm:inline">← {backLabel}</span>
    </Button>
  ) : null;

  return (
    <div className={showHeader ? "min-h-full bg-canvas text-ink" : undefined}>
      {showHeader ? (
        <header
          className={
            stickyHeader
              ? /* Short landscape: don't pin back+title+actions+AlbumNav (AURA-286) */
                "sticky top-0 z-20 border-b border-line bg-canvas/95 pt-[env(safe-area-inset-top)] backdrop-blur short-vh:static"
              : /* Under GalleryChrome — chrome already pads the notch (AURA-433). */
                "border-b border-line bg-canvas/95"
          }
        >
          <div className="shell-pad mx-auto max-w-[var(--public-max)] py-2 sm:py-3">
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:gap-2">
              <div className="min-w-0 flex-1">
                {backControl}
                {title ? (
                  <h1 className="truncate font-display text-xl short-vh:text-lg sm:text-3xl">
                    {title}
                  </h1>
                ) : null}
                {subtitle ? (
                  <p className="mt-0.5 line-clamp-2 text-sm text-muted short-vh:hidden">
                    {subtitle}
                  </p>
                ) : null}
              </div>
              {items.length ? (
                <ActionStack
                  actions={items}
                  primaryId={primaryActionId}
                  menuIds={menuActionIds}
                  className="w-full sm:max-w-xs sm:shrink-0"
                />
              ) : null}
            </div>
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
    <Button size="sm" tone="ghost" className="min-h-11" onClick={onShare}>
      {label}
    </Button>
  );
}
