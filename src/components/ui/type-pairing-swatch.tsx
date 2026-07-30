"use client";

import { cn } from "@/lib/cn";
import { FONT_PRESETS, fontPresetCssVars } from "@/lib/themes";

type Pairing = (typeof FONT_PRESETS)[number];

/** Typography kit picker — specimen preview for curated display+body pairings (AURA-228). */
export function TypePairingSwatch({
  pairing,
  selected,
  onSelect,
}: {
  pairing: Pairing;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "min-h-11 border p-3 text-left transition duration-[var(--duration-fast)]",
        selected
          ? "border-accent ring-1 ring-accent"
          : "border-line hover:border-ink/30",
      )}
      style={fontPresetCssVars(pairing.id)}
    >
      <span className="block font-display text-xl tracking-tight text-ink">
        {pairing.specimen}
      </span>
      <span className="mt-1 block text-xs leading-snug text-muted">
        {pairing.detail}
      </span>
      <span className="mt-2 block text-[11px] uppercase tracking-wider text-ink">
        {pairing.label}
      </span>
    </button>
  );
}
