"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { IconButton } from "@/components/ui/icon-button";
import { cn } from "@/lib/cn";
import {
  registerInertDialogRoot,
  unregisterInertDialogRoot,
} from "@/lib/inert-background";
import { useFocusTrap } from "@/lib/use-focus-trap";
import { useVisualViewportFrame } from "@/lib/use-visual-viewport-frame";

/**
 * Mobile-first bottom sheet (portal + scrim + safe-area).
 * Consumers may keep an anchored popover on desktop and only mount Sheet below `md`
 * (AURA-423 — foundation for NotificationBell / ActionStack More).
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
  className,
  id,
  initialFocusRef,
  "aria-label": ariaLabel,
}: {
  open: boolean;
  onClose: () => void;
  /** Visible heading; omit only when providing `aria-label`. */
  title?: string;
  children: ReactNode;
  className?: string;
  /** Panel id for `aria-controls` on the trigger. */
  id?: string;
  initialFocusRef?: RefObject<HTMLElement | null>;
  "aria-label"?: string;
}) {
  const [mounted, setMounted] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const label = title?.trim() || ariaLabel?.trim() || "";

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useLayoutEffect(() => {
    if (!open || !mounted) return;
    const root = rootRef.current;
    if (!root) return;
    registerInertDialogRoot(root);
    return () => unregisterInertDialogRoot(root);
  }, [open, mounted]);

  useFocusTrap(open && mounted, panelRef, {
    onEscape: onClose,
    initialFocusRef,
  });

  useVisualViewportFrame(open && mounted, rootRef);

  if (!open || !mounted) return null;
  if (process.env.NODE_ENV !== "production" && !label) {
    console.warn("Sheet requires `title` or `aria-label`");
  }

  return createPortal(
    <div
      ref={rootRef}
      data-aura-sheet-root
      /* Above lightbox (--z-overlay); below toast — AURA-449 / AURA-477.
       * top/left/w/h overridden by visualViewport (AURA-457). */
      className="fixed top-0 left-0 z-[calc(var(--z-overlay)+5)] flex h-full w-full items-end justify-center pt-[max(1rem,var(--safe-inset-top))] sm:items-end sm:justify-center sm:p-4 sm:pb-[max(1rem,var(--safe-inset-bottom))] sm:pt-[max(1rem,var(--safe-inset-top))]"
    >
      <button
        type="button"
        aria-label="Close sheet"
        className="absolute inset-0 bg-scrim"
        onClick={onClose}
        tabIndex={-1}
      />
      <div
        ref={panelRef}
        id={id}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-label={title ? undefined : label || "Sheet"}
        tabIndex={-1}
        className={cn(
          /* No overflow-hidden — focus rings must not clip (AURA-477 / Dialog AURA-460). */
          "relative z-10 flex w-full max-w-lg flex-col outline-none animate-enter",
          /* % of visualViewport frame — not layout dvh under keyboard (AURA-457). */
          "max-h-[min(90%,calc(100%-max(1rem,var(--safe-inset-top))))]",
          "rounded-t-xl border border-b-0 border-line bg-surface shadow-lg",
          "pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]",
          "sm:rounded-xl sm:border-b sm:pb-0 sm:pl-0 sm:pr-0",
          className,
        )}
      >
        <div
          className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-line sm:hidden"
          aria-hidden
        />
        <div className="flex shrink-0 items-start justify-between gap-3 px-5 pt-3 pb-3 sm:pt-5">
          {title ? (
            <h2 id={titleId} className="min-w-0 font-display text-2xl text-ink">
              {title}
            </h2>
          ) : (
            <span className="min-w-0 flex-1" />
          )}
          <IconButton
            onClick={onClose}
            aria-label="Close"
            data-focus-trap-skip-initial
          >
            ×
          </IconButton>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
