"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";
import { IconButton } from "@/components/ui/icon-button";

export function Dialog({
  open,
  onClose,
  title,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  const [mounted, setMounted] = useState(false);

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

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] sm:items-center">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-scrim"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "relative z-10 w-full max-w-lg animate-enter rounded-lg border border-line bg-surface p-5 shadow-lg",
          className,
        )}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="font-display text-2xl text-ink">{title}</h2>
          <IconButton onClick={onClose} aria-label="Close">
            ×
          </IconButton>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
