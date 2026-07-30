"use client";

import { cn } from "@/lib/cn";
import {
  siteLayoutThemePreset,
  type SiteLayoutTemplate,
} from "@/lib/site-layouts";

/** Starter site layout picker — module arrangement + brand kit (AURA-229). */
export function LayoutTemplateSwatch({
  template,
  selected,
  onSelect,
  disabled,
}: {
  template: SiteLayoutTemplate;
  selected: boolean;
  onSelect: () => void;
  disabled?: boolean;
}) {
  const preset = siteLayoutThemePreset(template);
  const enabledCount = template.modules.filter((m) => m.enabled).length;

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={selected}
      className={cn(
        "min-h-11 border p-2 text-left transition duration-[var(--duration-fast)]",
        selected
          ? "border-accent ring-1 ring-accent"
          : "border-line hover:border-ink/30",
        disabled ? "opacity-50" : "",
      )}
    >
      <span
        className="mb-2 flex h-12 flex-col justify-end px-2 pb-2"
        style={{
          background: preset.background,
          color: preset.ink,
          borderBottom: `3px solid ${preset.accent}`,
        }}
      >
        <span className="text-[10px] font-medium uppercase tracking-wider">
          {enabledCount} modules
        </span>
      </span>
      <span className="block text-[11px] uppercase tracking-wider text-ink">
        {template.label}
      </span>
      <span className="mt-0.5 block text-[10px] leading-snug text-muted">
        {template.detail}
      </span>
    </button>
  );
}
