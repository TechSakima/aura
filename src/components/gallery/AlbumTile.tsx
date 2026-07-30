"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function AlbumTile({
  href,
  onClick,
  coverUrl,
  label,
  meta,
  featured,
  className,
}: {
  href?: string;
  onClick?: () => void;
  coverUrl?: string | null;
  label: string;
  meta?: string;
  featured?: boolean;
  className?: string;
}) {
  const inner = (
    <>
      <div
        className={cn(
          "relative overflow-hidden bg-line",
          featured ? "aspect-[16/10] sm:aspect-[21/9]" : "aspect-[4/3]",
        )}
      >
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverUrl}
            alt=""
            className="h-full w-full object-cover transition-transform duration-emphasis group-hover:scale-[1.03]"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-scrim via-scrim-strong to-accent/40" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-scrim-strong via-scrim/30 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-4 text-on-media sm:p-5">
          <p className={cn("font-display", featured ? "text-2xl sm:text-3xl" : "text-xl")}>
            {label}
          </p>
          {meta ? <p className="mt-1 text-sm text-on-media-muted">{meta}</p> : null}
        </div>
      </div>
    </>
  );

  const shared = cn(
    "group block w-full overflow-hidden bg-canvas text-left no-underline",
    featured && "sm:col-span-2",
    className,
  );

  if (href) {
    return (
      <Link href={href} className={shared}>
        {inner}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={shared}>
      {inner}
    </button>
  );
}

export function AlbumTileGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">{children}</div>
  );
}
