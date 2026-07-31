"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

const STORAGE_PREFIX = "aura-gallery-coach:";

export function galleryCoachStorageKey(token: string) {
  return `${STORAGE_PREFIX}${token}`;
}

/** Sparse first-visit tips — dismissible, not a tutorial wall (AURA-254). */
export function GalleryCoachTips({
  token,
  enabled,
  hasDownloadPin,
  showContact,
  onVisibilityChange,
  className,
}: {
  token: string;
  enabled: boolean;
  hasDownloadPin?: boolean;
  /** Mention Message in chrome (AURA-308). */
  showContact?: boolean;
  /** Hide InstallHint while coach is up (AURA-432). */
  onVisibilityChange?: (visible: boolean) => void;
  className?: string;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!enabled || !token) {
      setVisible(false);
      return;
    }
    try {
      if (localStorage.getItem(galleryCoachStorageKey(token))) {
        setVisible(false);
        return;
      }
    } catch {
      setVisible(false);
      return;
    }
    setVisible(true);
  }, [enabled, token]);

  useEffect(() => {
    onVisibilityChange?.(visible);
    return () => onVisibilityChange?.(false);
  }, [visible, onVisibilityChange]);

  function dismiss() {
    try {
      localStorage.setItem(galleryCoachStorageKey(token), "1");
    } catch {
      /* private mode */
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label="How to use this gallery"
      className={cn(
        "pointer-events-none fixed inset-x-0 z-40 px-3",
        /* Clear thumb bar until desk — same breakpoint as GalleryChrome (AURA-432). */
        "bottom-[calc(var(--gallery-thumb-bar)+env(safe-area-inset-bottom)+0.5rem)]",
        "desk:bottom-[max(1rem,env(safe-area-inset-bottom))]",
        className,
      )}
    >
      <div className="pointer-events-auto mx-auto w-full max-w-sm rounded-lg border border-line bg-surface p-4 shadow-lg animate-enter">
        <p className="font-display text-lg text-ink">How to use</p>
        <ul className="mt-3 space-y-1.5 text-sm text-muted">
          <li>Heart photos to save favorites.</li>
          <li>
            {hasDownloadPin
              ? "Download all or favorites from Download — PIN required."
              : "Download all or favorites from Download."}
          </li>
          <li>Tap a photo to open it.</li>
          {showContact ? <li>Message the studio from Message.</li> : null}
        </ul>
        <Button
          type="button"
          tone="accent"
          className="mt-4 min-h-11 w-full"
          onClick={dismiss}
        >
          Got it
        </Button>
      </div>
    </div>
  );
}
