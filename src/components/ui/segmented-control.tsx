"use client";

import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

export type SegmentedOption<T extends string> = {
  id: T;
  label: string;
  icon?: ReactNode;
};

/** Segmented choice control — cover style, grid mode, calendar views (AURA-205). */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel?: string;
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="flex flex-wrap gap-2"
    >
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          aria-pressed={value === opt.id}
          onClick={() => onChange(opt.id)}
          className={cn(
            "min-h-11 border px-3 py-2 text-[11px] uppercase tracking-wider transition",
            value === opt.id
              ? "border-accent bg-accent text-accent-ink"
              : "border-line bg-surface text-ink hover:border-ink/30",
          )}
        >
          {opt.icon ? <span className="mr-1.5 inline-flex align-middle">{opt.icon}</span> : null}
          {opt.label}
        </button>
      ))}
    </div>
  );
}
