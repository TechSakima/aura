"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Selectable card for mutually exclusive options (packages, plans).
 * Prefer over ad-hoc bordered `<button>` recipes (AURA-205 / AURA-437).
 */
export function ChoiceCard({
  selected = false,
  disabled = false,
  onClick,
  children,
  className,
}: {
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "group flex w-full min-w-0 flex-col rounded-md border p-5 text-left transition-colors",
        "disabled:cursor-not-allowed",
        selected
          ? "border-ink bg-ink text-surface"
          : "border-line bg-surface hover:border-ink/40",
        disabled && !selected && "opacity-50",
        className,
      )}
    >
      {children}
    </button>
  );
}
