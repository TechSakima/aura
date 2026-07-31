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
import { cn } from "@/lib/cn";
import { IconButton } from "@/components/ui/icon-button";
import {
  registerInertDialogRoot,
  unregisterInertDialogRoot,
} from "@/lib/inert-background";
import { useFocusTrap } from "@/lib/use-focus-trap";

export function Dialog({
  open,
  onClose,
  title,
  children,
  className,
  initialFocusRef,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
  /** Prefer this control on open; otherwise autofocus / first content control. */
  initialFocusRef?: RefObject<HTMLElement | null>;
}) {
  const [mounted, setMounted] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

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

  if (!open || !mounted) return null;

  return createPortal(
    <div
      ref={rootRef}
      data-aura-dialog-root
      className="fixed inset-0 z-50 flex items-end justify-center p-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] sm:items-center"
    >
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-scrim"
        onClick={onClose}
        tabIndex={-1}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          "relative z-10 flex max-h-full w-full max-w-lg flex-col overflow-hidden animate-enter rounded-lg border border-line bg-surface shadow-lg outline-none",
          className,
        )}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 px-5 pt-5 pb-4">
          <h2 id={titleId} className="font-display text-2xl text-ink">
            {title}
          </h2>
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
