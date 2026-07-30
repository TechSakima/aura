"use client";

import type { MouseEvent, ReactNode, SVGProps } from "react";
import { IconButton } from "@/components/ui/icon-button";

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

export function IconMessage({ size = 18 }: { size?: number }) {
  return (
    <IconBase size={size}>
      <path d="M4 6h16v10a1 1 0 0 1-1 1H8l-4 3V6z" />
    </IconBase>
  );
}

/** Gallery chrome: IconButton + label (AURA-217). */
export function GalleryNavItem({
  label,
  onClick,
  children,
  active,
  className,
  tone,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  active?: boolean;
  className?: string;
  tone?: "default" | "onAccent";
}) {
  return (
    <IconButton
      label={label}
      active={active}
      onClick={onClick}
      className={className}
      tone={tone}
    >
      {children}
    </IconButton>
  );
}

/** Photo tile: same IconButton recipe, on-media hover (≥44px). */
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
    <IconButton
      label={label}
      onClick={onClick}
      className="min-h-11 min-w-11 rounded-none text-[10px] tracking-[0.14em] hover:bg-ink/5"
    >
      {children}
    </IconButton>
  );
}
