"use client";

import { cn } from "@/lib/cn";
import { IconButton } from "@/components/ui/icon-button";
import type { ReactNode } from "react";

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
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-ink/40"
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
    </div>
  );
}
