"use client";

import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

/** Shared list container — divide-y border-y (AURA-206). */
export function List({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <ul
      className={cn(
        "divide-y divide-line border-y border-line",
        className,
      )}
    >
      {children}
    </ul>
  );
}

/** One row in a List — flex layout, min height for touch. */
export function ListRow({
  children,
  className,
  href,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  href?: string;
  onClick?: () => void;
}) {
  const inner = (
    <div
      className={cn(
        "flex min-h-11 flex-wrap items-center justify-between gap-3 py-4",
        className,
      )}
    >
      {children}
    </div>
  );
  if (href) {
    return (
      <li>
        <a href={href} className="block no-underline">
          {inner}
        </a>
      </li>
    );
  }
  if (onClick) {
    return (
      <li>
        <button
          type="button"
          onClick={onClick}
          className="block w-full cursor-pointer border-0 bg-transparent p-0 text-left"
        >
          {inner}
        </button>
      </li>
    );
  }
  return <li>{inner}</li>;
}
