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

  const navClass = cn(
    "flex shrink-0 items-center gap-0.5 sm:gap-1",
    "max-md:w-full max-md:justify-around max-md:gap-0",
    variant === "bottom-bar" && "w-full justify-around gap-0",
  );

  const renderNav = () =>
    showNav ? (
      <nav aria-label="Gallery" className={navClass}>
        {showGalleryActions ? (
          <>
            <GalleryNavItem
              label={heartLabel}
              onClick={onFavorites}
              active={favoritesActive}
              tone={navTone}
            >
              <IconHeart filled={favoritesCount > 0} />
            </GalleryNavItem>
            <GalleryNavItem label="Download" onClick={onDownload} tone={navTone}>
              <IconDownload />
            </GalleryNavItem>
            <GalleryNavItem label="Share" onClick={onShare} tone={navTone}>
              <IconShare />
            </GalleryNavItem>
          </>
        ) : null}
        {showContactAction ? (
          <GalleryNavItem
            label="Message"
            onClick={onContact!}
            tone={navTone}
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
            "truncate text-[10px] uppercase tracking-[0.22em]",
            branded ? "text-accent-ink/75" : "text-muted",
          )}
        >
          {studioName}
        </p>
      ) : null}
    </div>
  );

  /** Thumb-zone actions on small screens (AURA-250). */
  const mobileBottomNav = showNav ? (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-30 md:hidden",
        branded
          ? "bg-accent pb-[env(safe-area-inset-bottom)] text-accent-ink"
          : "border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md",
      )}
    >
      <div className="px-1 py-1">{renderNav()}</div>
    </div>
  ) : null;

  if (variant === "floating") {
    return (
      <>
        <header className="pointer-events-none sticky top-0 z-30 px-4 pt-[env(safe-area-inset-top)] sm:px-8">
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
                "fixed z-40 hidden sm:block",
                "sm:top-[max(0.75rem,env(safe-area-inset-top))] sm:right-[max(0.75rem,env(safe-area-inset-right))]",
              )}
            >
              <div className="rounded-lg border border-line bg-surface/95 p-1 shadow-lg backdrop-blur-md">
                {renderNav()}
              </div>
            </div>
            <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md sm:hidden">
              <div className="px-1 py-1">{renderNav()}</div>
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
          <div className="mx-auto flex max-w-[var(--public-max)] items-center justify-between gap-3 px-4 py-2.5 sm:px-8">
            {titleBlock}
            {showNav ? (
              <div className="hidden md:block">{renderNav()}</div>
            ) : null}
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
          <div className="mx-auto flex max-w-[var(--public-max)] items-center justify-between gap-3 px-4 py-2.5 sm:px-8">
            {titleBlock}
            {showNav ? (
              <div className="hidden md:block">{renderNav()}</div>
            ) : null}
          </div>
        </header>
        {mobileBottomNav}
      </>
    );
  }

  /* sticky-minimal — bottom actions below md for one-handed use */
  return (
    <>
      <header className="sticky top-0 z-30 border-b border-line bg-surface/95 pt-[env(safe-area-inset-top)] backdrop-blur-md">
        <div className="mx-auto flex max-w-[var(--public-max)] items-center justify-between gap-3 px-4 py-2.5 sm:px-8">
          {titleBlock}
          {showNav ? (
            <div className="hidden md:block">{renderNav()}</div>
          ) : null}
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
  if (chrome.variant === "floating") {
    return "pb-[calc(4.75rem+env(safe-area-inset-bottom))] sm:pb-0";
  }
  /* sticky-minimal, branded, bottom-bar: thumb bar below md */
  return "pb-[calc(4.75rem+env(safe-area-inset-bottom))] md:pb-0";
}
