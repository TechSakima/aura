"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import type { MasonryPhoto } from "@/components/gallery/MasonryGrid";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { cn } from "@/lib/cn";
import { useFocusTrap } from "@/lib/use-focus-trap";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";

function displayFilename(photo: MasonryPhoto): string | undefined {
  const raw = photo.filename?.trim();
  if (!raw) return undefined;
  const base = raw.split(/[/\\]/).pop() || raw;
  return base.length > 48 ? `${base.slice(0, 45)}…` : base;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
}

export function PhotoLightbox({
  photos,
  index,
  onIndexChange,
  onClose,
  footer,
  caption,
}: {
  photos: MasonryPhoto[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  footer?: ReactNode;
  /** Override caption; defaults to photo filename. */
  caption?: string;
}) {
  const photo = photos[index] || null;
  const hasPrev = index > 0;
  const hasNext = index < photos.length - 1;
  const rootRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [mounted, setMounted] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();

  const counter = useMemo(
    () => (photos.length ? `${index + 1} of ${photos.length}` : ""),
    [index, photos.length],
  );
  const fileCaption = caption ?? (photo ? displayFilename(photo) : undefined);
  const isVideo = Boolean(
    photo && (photo.kind === "video" || photo.videoUrl),
  );
  const liveLabel = useMemo(() => {
    if (!photo) return "";
    const parts = [counter];
    if (fileCaption) parts.push(fileCaption);
    if (isVideo) parts.push("Video");
    return parts.filter(Boolean).join(" · ");
  }, [photo, counter, fileCaption, isVideo]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useFocusTrap(Boolean(photo) && mounted, rootRef, {
    onEscape: onClose,
    initialFocusRef: closeRef,
  });

  useEffect(() => {
    if (!photo) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKey(e: KeyboardEvent) {
      if (isEditableTarget(e.target)) return;
      if (e.key === "ArrowLeft" && hasPrev) {
        e.preventDefault();
        onIndexChange(index - 1);
        return;
      }
      if (e.key === "ArrowRight" && hasNext) {
        e.preventDefault();
        onIndexChange(index + 1);
        return;
      }
      if (e.key === "Home" && index > 0) {
        e.preventDefault();
        onIndexChange(0);
        return;
      }
      if (e.key === "End" && index < photos.length - 1) {
        e.preventDefault();
        onIndexChange(photos.length - 1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [photo, hasPrev, hasNext, index, onIndexChange, photos.length]);

  if (!photo || !mounted) return null;

  return createPortal(
    <div
      ref={rootRef}
      tabIndex={-1}
      className={cn(
        "fixed inset-0 z-50 flex flex-col bg-scrim-strong text-on-media outline-none",
        !prefersReducedMotion && "animate-fade",
      )}
      role="dialog"
      aria-modal="true"
      aria-label="Photo viewer"
      aria-roledescription="carousel"
    >
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {liveLabel}
      </p>

      <header className="flex shrink-0 items-center justify-between gap-3 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2 sm:px-6">
        <p className="min-w-0 truncate text-sm text-on-media-muted" aria-hidden>
          {counter}
        </p>
        <Button
          ref={closeRef}
          tone="onMedia"
          size="sm"
          className="min-h-11 min-w-11"
          onClick={onClose}
        >
          Close
        </Button>
      </header>

      <div className="relative flex min-h-0 flex-1 items-center justify-center px-3 sm:px-16">
        {hasPrev ? (
          <IconButton
            aria-label="Previous photo"
            className="absolute left-1 top-1/2 z-10 size-11 min-h-11 min-w-11 -translate-y-1/2 bg-on-media/10 text-on-media hover:bg-on-media/20 sm:left-4"
            onClick={() => onIndexChange(index - 1)}
          >
            ‹
          </IconButton>
        ) : null}
        {hasNext ? (
          <IconButton
            aria-label="Next photo"
            className="absolute right-1 top-1/2 z-10 size-11 min-h-11 min-w-11 -translate-y-1/2 bg-on-media/10 text-on-media hover:bg-on-media/20 sm:right-4"
            onClick={() => onIndexChange(index + 1)}
          >
            ›
          </IconButton>
        ) : null}

        {isVideo ? (
          <video
            key={photo.id}
            src={photo.videoUrl || photo.url}
            controls
            playsInline
            className={cn(
              "max-h-full max-w-full",
              !prefersReducedMotion && "animate-enter",
            )}
            poster={photo.thumbUrl || undefined}
          />
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            key={photo.id}
            src={photo.url}
            alt={fileCaption || `Photo ${index + 1} of ${photos.length}`}
            className={cn(
              "max-h-full max-w-full object-contain",
              !prefersReducedMotion && "animate-enter",
            )}
          />
        )}
      </div>

      {fileCaption ? (
        <p className="shrink-0 truncate px-4 py-2 text-center text-xs text-on-media-muted sm:px-6">
          {fileCaption}
        </p>
      ) : null}

      {footer ? (
        <div
          className={cn(
            "shrink-0 border-t border-line bg-surface text-ink",
            "px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6",
            "max-h-[40vh] overflow-y-auto",
          )}
        >
          {footer}
        </div>
      ) : (
        <div className="pb-[env(safe-area-inset-bottom)]" />
      )}
    </div>,
    document.body,
  );
}
