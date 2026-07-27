"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import type { GalleryThemeId } from "@/lib/types";
import { resolveGalleryTheme } from "@/lib/themes";

export function GalleryHero({
  images,
  title,
  dateLabel,
  daysLeft,
  compact = false,
  themeId = "echo",
  coverFocalX,
  coverFocalY,
  onViewGallery,
}: {
  images: string[];
  title: string;
  dateLabel?: string | null;
  daysLeft?: number | null;
  compact?: boolean;
  themeId?: GalleryThemeId;
  coverFocalX?: number;
  coverFocalY?: number;
  onViewGallery?: () => void;
}) {
  const slides = images.length ? images : [];
  const [index, setIndex] = useState(0);
  const [entered, setEntered] = useState(false);
  const theme = resolveGalleryTheme(themeId);
  const layout = theme.layout;
  const minH = compact
    ? "min-h-[42vh] sm:min-h-[48vh]"
    : "min-h-[72vh] sm:min-h-[85vh]";

  useEffect(() => {
    const t = window.setTimeout(() => setEntered(true), 40);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (slides.length < 2) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, 5600);
    return () => window.clearInterval(id);
  }, [slides.length]);

  const objectPosition =
    coverFocalX != null && coverFocalY != null
      ? `${coverFocalX}% ${coverFocalY}%`
      : "center";

  const titleClass =
    layout === "centered"
      ? "font-display text-4xl font-light tracking-[0.08em] sm:text-6xl md:text-7xl"
      : layout === "vertical"
        ? "font-display text-4xl uppercase tracking-[0.2em] [writing-mode:vertical-rl] rotate-180 sm:text-5xl"
        : themeId === "lark" || themeId === "obsidian"
          ? "font-sans text-3xl font-semibold uppercase tracking-[0.12em] sm:text-5xl md:text-6xl"
          : "font-sans text-3xl font-semibold uppercase tracking-[0.16em] sm:text-5xl md:text-6xl";

  const cta = onViewGallery ? (
    <button
      type="button"
      onClick={onViewGallery}
      className="mt-8 border border-surface/90 px-6 py-2.5 text-[11px] font-medium uppercase tracking-[0.22em] text-surface transition hover:bg-surface hover:text-ink sm:mt-0"
    >
      View gallery
    </button>
  ) : null;

  return (
    <section
      className={cn(
        "relative w-full overflow-hidden bg-ink text-surface",
        minH,
      )}
    >
      {slides.length ? (
        slides.map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={`${src}-${i}`}
            src={src}
            alt=""
            className={cn(
              "absolute inset-0 h-full w-full object-cover transition-opacity duration-[1600ms] ease-out",
              i === index ? "opacity-100" : "opacity-0",
            )}
            style={{ objectPosition }}
          />
        ))
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-ink via-ink to-ink/80" />
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-ink/25 to-ink/20" />

      <div
        className={cn(
          "relative z-10 flex px-5 sm:px-10",
          minH,
          layout === "vertical"
            ? "items-start justify-center pb-12 pl-6 sm:pl-12"
            : layout === "centered"
              ? "items-center justify-center pb-12 text-center"
              : "items-end justify-center pb-14 sm:pb-16",
          entered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3",
          "transition-all duration-700 ease-out",
        )}
      >
        {layout === "split" ? (
          <div className="mx-auto flex w-full max-w-[1400px] flex-col items-center gap-8 text-center sm:flex-row sm:items-end sm:justify-between sm:text-left">
            <div>
              <h1 className={titleClass}>{title}</h1>
              {dateLabel ? (
                <p className="mt-3 text-[11px] uppercase tracking-[0.28em] text-surface/85">
                  {dateLabel}
                </p>
              ) : null}
              {daysLeft != null && daysLeft >= 0 ? (
                <p className="mt-2 text-xs uppercase tracking-[0.16em] text-surface/70">
                  {daysLeft === 0
                    ? "Last day to download"
                    : `${daysLeft} days left`}
                </p>
              ) : null}
              <div className="sm:hidden">{cta}</div>
            </div>
            <div className="hidden sm:block">{cta}</div>
          </div>
        ) : (
          <div
            className={cn(
              "mx-auto w-full max-w-[var(--shell-max)]",
              layout === "centered" ? "flex flex-col items-center" : "",
            )}
          >
            {dateLabel && layout !== "vertical" ? (
              <p className="mb-3 text-[11px] uppercase tracking-[0.28em] text-surface/85">
                {dateLabel}
              </p>
            ) : null}

            <h1 className={titleClass}>{title}</h1>

            {daysLeft != null && daysLeft >= 0 && layout !== "vertical" ? (
              <p className="mt-4 text-xs uppercase tracking-[0.16em] text-surface/70">
                {daysLeft === 0
                  ? "Last day to download"
                  : `${daysLeft} days left`}
              </p>
            ) : null}

            {cta}
          </div>
        )}
      </div>
    </section>
  );
}
