"use client";

import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/cn";

type FadeFrom = "canvas" | "surface";

const fadeFromClass: Record<FadeFrom, string> = {
  canvas: "from-canvas",
  surface: "from-surface",
};

/**
 * Contained horizontal scroller with edge fades (AURA-377).
 * Scrollbar hidden; left/right gradients appear when more content exists that way.
 */
export function ScrollRail({
  children,
  className,
  contentClassName,
  fadeFrom = "canvas",
  fadeWidthClass = "w-8 sm:w-12",
  "aria-label": ariaLabel,
}: {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  fadeFrom?: FadeFrom;
  fadeWidthClass?: string;
  "aria-label"?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const sync = () => {
      const { scrollLeft, scrollWidth, clientWidth } = el;
      setCanLeft(scrollLeft > 2);
      setCanRight(scrollLeft + clientWidth < scrollWidth - 2);
    };

    sync();
    el.addEventListener("scroll", sync, { passive: true });
    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(sync)
        : null;
    ro?.observe(el);
    window.addEventListener("resize", sync);
    return () => {
      el.removeEventListener("scroll", sync);
      ro?.disconnect();
      window.removeEventListener("resize", sync);
    };
  }, [children]);

  const from = fadeFromClass[fadeFrom];

  return (
    <div className={cn("relative min-w-0", className)}>
      <div
        ref={ref}
        aria-label={ariaLabel}
        className={cn(
          "flex overflow-x-auto overscroll-x-contain",
          "[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          contentClassName,
        )}
      >
        {children}
      </div>
      <div
        className={cn(
          "pointer-events-none absolute inset-y-0 left-0 bg-gradient-to-r to-transparent transition-opacity",
          fadeWidthClass,
          from,
          canLeft ? "opacity-100" : "opacity-0",
        )}
        aria-hidden
      />
      <div
        className={cn(
          "pointer-events-none absolute inset-y-0 right-0 bg-gradient-to-l to-transparent transition-opacity",
          fadeWidthClass,
          from,
          canRight ? "opacity-100" : "opacity-0",
        )}
        aria-hidden
      />
    </div>
  );
}
