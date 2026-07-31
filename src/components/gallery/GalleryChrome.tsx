"use client";

import {
  GalleryNavItem,
  IconDownload,
  IconHeart,
  IconMessage,
  IconShare,
} from "@/components/gallery/GalleryIcons";
import { cn } from "@/lib/cn";
import type { GalleryChromeModule } from "@/lib/types";

export function GalleryChrome({
  chrome,
  title,
  studioName,
  logoUrl,
  expired,
  favoritesCount,
  favoritesLabel,
  favoritesActive,
  onFavorites,
  onDownload,
  onShare,
  showContact,
  onContact,
}: {
  chrome: GalleryChromeModule;
  title: string;
  studioName: string;
  logoUrl?: string;
  expired?: boolean;
  favoritesCount: number;
  /** Override nav label — e.g. “3 of 25” (AURA-248). */
  favoritesLabel?: string;
  favoritesActive?: boolean;
  onFavorites: () => void;
  onDownload: () => void;
  onShare: () => void;
  /** Message studio from chrome (AURA-308). */
  showContact?: boolean;
  onContact?: () => void;
}) {
  const variant = chrome.variant;
  const branded = variant === "branded";
  const showGalleryActions = !expired;
  const showContactAction = Boolean(showContact && onContact);
  const showNav = showGalleryActions || showContactAction;
  const navTone = branded ? "onAccent" : "default";
  const heartLabel =
    favoritesLabel ||
    (favoritesCount > 0 ? `Favorites (${favoritesCount})` : "Favorites");

  const renderNav = (iconOnly: boolean) =>
    showNav ? (
      <nav
        aria-label="Gallery"
        className={cn(
          "flex w-full shrink-0 items-center justify-around gap-0",
          !iconOnly && "desk:w-auto desk:justify-start desk:gap-1",
          variant === "bottom-bar" && "w-full justify-around gap-0",
        )}
      >
        {showGalleryActions ? (
          <>
            <GalleryNavItem
              label={heartLabel}
              onClick={onFavorites}
              active={favoritesActive}
              tone={navTone}
              iconOnly={iconOnly}
            >
              <IconHeart filled={favoritesCount > 0} />
            </GalleryNavItem>
            <GalleryNavItem
              label="Download"
              onClick={onDownload}
              tone={navTone}
              iconOnly={iconOnly}
            >
              <IconDownload />
            </GalleryNavItem>
            <GalleryNavItem
              label="Share"
              onClick={onShare}
              tone={navTone}
              iconOnly={iconOnly}
            >
              <IconShare />
            </GalleryNavItem>
          </>
        ) : null}
        {showContactAction ? (
          <GalleryNavItem
            label="Message"
            onClick={onContact!}
            tone={navTone}
            iconOnly={iconOnly}
          >
            <IconMessage />
          </GalleryNavItem>
        ) : null}
      </nav>
    ) : null;

  const logo =
    chrome.showLogo && logoUrl ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt=""
        className="h-8 w-auto max-w-[7rem] object-contain"
      />
    ) : null;

  const titleBlock = (
    <div className="min-w-0">
      {logo ? <div className="mb-1">{logo}</div> : null}
      <p
        className={cn(
          "truncate text-sm font-semibold uppercase tracking-[0.14em]",
          branded ? "text-accent-ink" : "text-ink",
        )}
      >
        {title}
      </p>
      {chrome.showStudioName ? (
        <p
          className={cn(
            "truncate text-xs uppercase tracking-[0.18em]",
            branded ? "text-accent-ink/80" : "text-muted",
          )}
        >
          {studioName}
        </p>
      ) : null}
    </div>
  );

  /** Thumb-zone until desk (AURA-250/286/378/410) — tablets keep bottom nav. */
  const mobileBottomNav = showNav ? (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-30 pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] desk:hidden",
        branded
          ? "bg-accent pb-[env(safe-area-inset-bottom)] text-accent-ink"
          : "border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md",
      )}
    >
      <div className="px-1 py-1">{renderNav(true)}</div>
    </div>
  ) : null;

  const headerNav = showNav ? (
    <div className="hidden desk:block">{renderNav(false)}</div>
  ) : null;

  const headerInner =
    "shell-pad mx-auto flex max-w-[var(--public-max)] items-center justify-between gap-3 py-2.5";

  if (variant === "floating") {
    return (
      <>
        <header className="pointer-events-none sticky top-0 z-30 shell-pad pt-[env(safe-area-inset-top)]">
          <div className="pointer-events-auto mx-auto flex max-w-[var(--public-max)] py-2.5">
            <div className="rounded-md border border-line bg-surface/90 px-3 py-2 backdrop-blur-md">
              {titleBlock}
            </div>
          </div>
        </header>
        {showNav ? (
          <>
            <div
              className={cn(
                "fixed z-40 hidden desk:block",
                "top-[max(0.75rem,env(safe-area-inset-top))] right-[max(0.75rem,env(safe-area-inset-right))]",
              )}
            >
              <div className="rounded-lg border border-line bg-surface/95 p-1 shadow-lg backdrop-blur-md">
                {renderNav(false)}
              </div>
            </div>
            <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] backdrop-blur-md desk:hidden">
              <div className="px-1 py-1">{renderNav(true)}</div>
            </div>
          </>
        ) : null}
      </>
    );
  }

  if (variant === "bottom-bar") {
    return (
      <>
        <header className="sticky top-0 z-30 border-b border-line bg-surface/95 pt-[env(safe-area-inset-top)] backdrop-blur-md">
          <div className={headerInner}>
            {titleBlock}
            {headerNav}
          </div>
        </header>
        {mobileBottomNav}
      </>
    );
  }

  if (variant === "branded") {
    return (
      <>
        <header className="sticky top-0 z-30 bg-accent pt-[env(safe-area-inset-top)] text-accent-ink">
          <div className={headerInner}>
            {titleBlock}
            {headerNav}
          </div>
        </header>
        {mobileBottomNav}
      </>
    );
  }

  /* sticky-minimal — thumb bar until desk (AURA-286/410) */
  return (
    <>
      <header className="sticky top-0 z-30 border-b border-line bg-surface/95 pt-[env(safe-area-inset-top)] backdrop-blur-md">
        <div className={headerInner}>
          {titleBlock}
          {headerNav}
        </div>
      </header>
      {mobileBottomNav}
    </>
  );
}

/** Extra bottom pad so fixed chrome does not cover content. */
export function galleryChromePadClass(
  chrome: GalleryChromeModule,
  expired?: boolean,
  showContact?: boolean,
): string {
  if (expired && !showContact) return "";
  /* Thumb bar until desk — unified floating + sticky variants (AURA-286/378/410) */
  return "pb-[calc(4.75rem+env(safe-area-inset-bottom))] desk:pb-0";
}
