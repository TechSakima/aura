"use client";

import { ButtonLink, ScrollRail } from "@/components/ui";
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
    /* Static on phone — AlbumView keeps title sticky only from sm (AURA-467). */
    <nav aria-label={label} className="static border-b border-line bg-canvas">
      <div className="shell-pad mx-auto max-w-[var(--public-max)] py-1.5 sm:py-2">
        <p className="mb-1 hidden text-xs uppercase tracking-[0.14em] text-muted sm:block">
          {label}
        </p>
        <ScrollRail
          fadeFrom="canvas"
          aria-label={label}
          contentClassName="gap-2 pb-1"
        >
          {items.map((item) => (
            <ButtonLink
              key={item.id}
              href={item.href}
              aria-current={item.active ? "page" : undefined}
              tone={item.active ? "accent" : "ghost"}
              size="sm"
              className={cn(
                "shrink-0 text-[11px] uppercase tracking-[0.14em]",
                !item.active &&
                  "border border-line bg-surface hover:border-ink/30",
              )}
            >
              {item.label}
            </ButtonLink>
          ))}
        </ScrollRail>
      </div>
    </nav>
  );
}
