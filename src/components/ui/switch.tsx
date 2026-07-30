"use client";

import { cn } from "@/lib/cn";

export function Switch({
  checked,
  onCheckedChange,
  id,
  label,
  disabled,
}: {
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  id?: string;
  label?: string;
  disabled?: boolean;
}) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => {
        if (disabled) return;
        onCheckedChange(!checked);
      }}
      className={cn(
        /* Visual track stays h-7; control hit ≥44×44 (AURA-375) */
        "relative inline-flex h-11 min-h-11 w-14 shrink-0 items-center justify-center rounded-md",
        "touch-target transition-opacity",
        disabled && "cursor-not-allowed opacity-40",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "relative inline-flex h-7 w-12 items-center rounded-full transition-colors",
          checked ? "bg-accent" : "bg-line",
        )}
      >
        <span
          className={cn(
            "inline-block size-5 translate-x-1 rounded-full bg-surface-elevated shadow-sm transition-transform",
            checked && "translate-x-6",
          )}
        />
      </span>
    </button>
  );
}
