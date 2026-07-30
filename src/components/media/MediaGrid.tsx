"use client";

import { Fragment, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import {
  MEDIA_GRID_ENTER_CLASS,
  mediaGridContainerClass,
  mediaGridItemClass,
  type MediaGridMode,
} from "@/lib/media-grid";

export function MediaGrid<T>({
  mode,
  items,
  getKey,
  renderItem,
  className,
  enter = true,
  staggerMs = 40,
  maxStaggerIndex = 12,
}: {
  mode: MediaGridMode;
  items: T[];
  getKey: (item: T, index: number) => string;
  renderItem: (
    item: T,
    ctx: {
      index: number;
      mode: MediaGridMode;
      itemClassName: string;
      animationDelay: string;
    },
  ) => ReactNode;
  className?: string;
  /** Staggered enter from motion tokens (AURA-246). */
  enter?: boolean;
  staggerMs?: number;
  maxStaggerIndex?: number;
}) {
  const itemClassName = mediaGridItemClass(mode);

  return (
    <div
      className={cn(
        mediaGridContainerClass(mode),
        enter && MEDIA_GRID_ENTER_CLASS,
        className,
      )}
    >
      {items.map((item, index) => (
        <Fragment key={getKey(item, index)}>
          {renderItem(item, {
            index,
            mode,
            itemClassName,
            animationDelay: `${Math.min(index, maxStaggerIndex) * staggerMs}ms`,
          })}
        </Fragment>
      ))}
    </div>
  );
}
