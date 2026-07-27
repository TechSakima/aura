"use client";

import type { MouseEvent, ReactNode, SVGProps } from "react";
import { cn } from "@/lib/cn";

function IconBase({
  size = 18,
  ...props
}: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    />
  );
}

export function IconHeart({
  filled,
  size = 18,
}: {
  filled?: boolean;
  size?: number;
}) {
  if (filled) {
    return (
      <IconBase size={size} fill="currentColor" stroke="none">
        <path d="M12 21s-6.7-4.35-9.33-8.03C.5 10.08 2.18 6.5 5.8 6.5c2.02 0 3.15 1.08 4.2 2.22C11.05 7.58 12.18 6.5 14.2 6.5c3.62 0 5.3 3.58 3.13 6.47C18.7 16.65 12 21 12 21z" />
      </IconBase>
    );
  }
  return (
    <IconBase size={size}>
      <path d="M12 21s-6.7-4.35-9.33-8.03C.5 10.08 2.18 6.5 5.8 6.5c2.02 0 3.15 1.08 4.2 2.22C11.05 7.58 12.18 6.5 14.2 6.5c3.62 0 5.3 3.58 3.13 6.47C18.7 16.65 12 21 12 21z" />
    </IconBase>
  );
}

export function IconDownload({ size = 18 }: { size?: number }) {
  return (
    <IconBase size={size}>
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </IconBase>
  );
}

export function IconShare({ size = 18 }: { size?: number }) {
  return (
    <IconBase size={size}>
      <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" />
      <path d="M12 3v12" />
      <path d="m7 8 5-5 5 5" />
    </IconBase>
  );
}

/** Pixieset-style: icon + text label, not icon-only mystery glyphs. */
export function GalleryNavItem({
  label,
  onClick,
  children,
  active,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-10 items-center gap-2 px-2.5 text-[11px] font-medium uppercase tracking-[0.16em] transition",
        active ? "text-ink" : "text-ink/65 hover:text-ink",
      )}
    >
      <span className="inline-flex shrink-0">{children}</span>
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

/** Photo hover: readable labeled actions, not micro-icons. */
export function GalleryTileAction({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: (e: MouseEvent) => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="inline-flex h-9 items-center gap-1.5 px-2.5 text-[10px] font-medium uppercase tracking-[0.14em] text-ink transition hover:bg-ink/5"
    >
      <span className="inline-flex shrink-0">{children}</span>
      <span className="hidden md:inline">{label}</span>
    </button>
  );
}
