"use client";

import Link from "next/link";
import { cn } from "@/lib/cn";

export type AlbumNavItem = {
  id: string;
  label: string;
  href: string;
  active?: boolean;
};

/** Sibling album switcher for public album surfaces (AURA-247). */
export function AlbumNav({
  items,
  label = "Albums",
}: {
  items: AlbumNavItem[];
  label?: string;
}) {
  if (items.length < 2) return null;

  return (
    <nav aria-label={label} className="border-b border-line bg-canvas">
      <div className="shell-pad mx-auto max-w-[var(--public-max)] py-2">
        <p className="mb-1 text-[10px] uppercase tracking-[0.16em] text-muted">
          {label}
        </p>
        <ul
          className={cn(
            "flex gap-2 overflow-x-auto overscroll-x-contain pb-1",
            "[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          )}
        >
          {items.map((item) => (
            <li key={item.id} className="shrink-0">
              <Link
                href={item.href}
                aria-current={item.active ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-11 items-center rounded-md border px-3 text-[11px] font-medium uppercase tracking-[0.14em] no-underline transition-colors",
                  item.active
                    ? "border-accent bg-accent text-accent-ink"
                    : "border-line bg-surface text-ink hover:border-ink/30",
                )}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
