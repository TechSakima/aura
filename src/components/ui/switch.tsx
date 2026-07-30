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
        "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors",
        checked ? "bg-accent" : "bg-line",
        disabled && "cursor-not-allowed opacity-40",
      )}
    >
      <span
        className={cn(
          "inline-block size-5 translate-x-1 rounded-full bg-surface-elevated shadow-sm transition-transform",
          checked && "translate-x-6",
        )}
      />
    </button>
  );
}
