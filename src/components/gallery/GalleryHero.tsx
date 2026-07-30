"use client";

import { useEffect, useState } from "react";
import { PublicCta } from "@/components/ui";
import { cn } from "@/lib/cn";
import { effectiveCoverLayout } from "@/lib/gallery-cover-treatments";
import type {
  GalleryCoverModule,
  GalleryHeroLayout,
  GalleryTitleTreatment,
} from "@/lib/types";

function titleClassFor(treatment: GalleryTitleTreatment): string {
  const wrap = "max-w-full min-w-0 break-words";
  switch (treatment) {
    case "display-light":
      return cn(
        wrap,
        "font-display text-4xl font-light tracking-[0.08em] sm:text-6xl md:text-7xl",
      );
    case "display-vertical":
      // Vertical type only when roomy — not landscape phones (AURA-283/286).
      return cn(
        wrap,
        "font-display text-3xl uppercase tracking-[0.16em] sm:text-4xl",
        "roomy:text-5xl roomy:tracking-[0.2em] roomy:[writing-mode:vertical-rl] roomy:rotate-180",
      );
    case "sans-tight":
      return cn(
        wrap,
        "font-sans text-3xl font-semibold uppercase tracking-[0.12em] sm:text-5xl md:text-6xl",
      );
    case "sans-wide":
    default:
      return cn(
        wrap,
        "font-sans text-3xl font-semibold uppercase tracking-[0.16em] sm:text-5xl md:text-6xl",
      );
  }
}

function frameClassFor(layout: GalleryHeroLayout): string {
  switch (layout) {
    case "vertical":
      return "items-start justify-center pb-12 pl-6 sm:pl-12";
    case "centered":
      return "items-center justify-center pb-12 text-center";
    case "minimal":
      return "items-end justify-start pb-10 sm:pb-12";
    case "cinematic":
      return "items-end justify-center pb-16 sm:pb-24 text-center";
    case "split":
    default:
      return "items-end justify-center pb-14 sm:pb-16";
  }
}

function scrimClassFor(scrim: GalleryCoverModule["scrim"]): string {
  if (scrim === "strong") {
    return "bg-gradient-to-t from-scrim-strong via-scrim/70 to-scrim/45";
  }
  return "bg-gradient-to-t from-scrim-strong via-scrim/40 to-scrim/25";
}

export function GalleryHero({
  images,
  title,
  dateLabel,
  daysLeft,
  cover,
  onViewGallery,
}: {
  images: string[];
  title: string;
  dateLabel?: string | null;
  daysLeft?: number | null;
  cover: GalleryCoverModule;
  onViewGallery?: () => void;
}) {
  const slides = images.length ? images : [];
  const [index, setIndex] = useState(0);
  const [entered, setEntered] = useState(false);

  const layout = effectiveCoverLayout(cover);
  const compact = cover.style === "third";
  const immersive = cover.style === "immersive";
  const minH = compact
    ? "min-h-[42vh] sm:min-h-[48vh]"
    : immersive || layout === "cinematic"
      ? "min-h-[85vh] sm:min-h-[100svh]"
      : layout === "minimal"
        ? "min-h-[56vh] sm:min-h-[64vh]"
        : "min-h-[72vh] sm:min-h-[85vh]";

  const showDate = cover.showDate && Boolean(dateLabel);
  const showDays =
    cover.showDaysLeft && daysLeft != null && daysLeft >= 0 && layout !== "vertical";
  const showCta = cover.showCta && Boolean(onViewGallery);
  const titleClass = titleClassFor(cover.titleTreatment);

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
    cover.focalX != null && cover.focalY != null
      ? `${cover.focalX}% ${cover.focalY}%`
      : "center";

  const cta = showCta ? (
    <PublicCta
      surface="media"
      onClick={onViewGallery}
      className="mt-8 sm:mt-0"
    >
      View gallery
    </PublicCta>
  ) : null;

  const dateEl = showDate ? (
    <p className="text-[11px] uppercase tracking-[0.28em] text-on-media-muted">
      {dateLabel}
    </p>
  ) : null;

  const daysEl = showDays ? (
    <p className="text-xs uppercase tracking-[0.16em] text-on-media-muted">
      {daysLeft === 0 ? "Last day to download" : `${daysLeft} days left`}
    </p>
  ) : null;

  return (
    <section
      className={cn(
        "relative w-full overflow-hidden bg-scrim-strong text-on-media",
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
              "absolute inset-0 h-full w-full object-cover transition-opacity duration-crossfade ease-out",
              i === index ? "opacity-100" : "opacity-0",
            )}
            style={{ objectPosition }}
          />
        ))
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-scrim-strong via-scrim to-scrim/80" />
      )}

      <div className={cn("absolute inset-0", scrimClassFor(cover.scrim))} />

      <div
        className={cn(
          "relative z-10 flex min-w-0 shell-pad pt-[env(safe-area-inset-top)]",
          minH,
          frameClassFor(layout),
          entered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3",
          "transition-all duration-emphasis ease-out",
        )}
      >
        {layout === "split" ? (
          <div className="mx-auto flex w-full min-w-0 max-w-[var(--public-max)] flex-col items-center gap-8 text-center roomy:flex-row roomy:items-end roomy:justify-between roomy:text-left">
            <div className="min-w-0 max-w-full">
              <h1 className={titleClass}>{title}</h1>
              {dateEl ? <div className="mt-3">{dateEl}</div> : null}
              {daysEl ? <div className="mt-2">{daysEl}</div> : null}
              <div className="roomy:hidden">{cta}</div>
            </div>
            <div className="hidden shrink-0 roomy:block">{cta}</div>
          </div>
        ) : layout === "minimal" ? (
          <div className="mx-auto w-full min-w-0 max-w-[var(--public-max)] text-left">
            {dateEl ? <div className="mb-2">{dateEl}</div> : null}
            <h1 className={titleClass}>{title}</h1>
            {daysEl ? <div className="mt-3">{daysEl}</div> : null}
            {cta}
          </div>
        ) : layout === "cinematic" ? (
          <div className="mx-auto flex w-full min-w-0 max-w-[var(--public-max)] flex-col items-center">
            {dateEl ? <div className="mb-4">{dateEl}</div> : null}
            <h1 className={titleClass}>{title}</h1>
            {daysEl ? <div className="mt-5">{daysEl}</div> : null}
            {cta}
          </div>
        ) : (
          <div
            className={cn(
              "mx-auto w-full min-w-0 max-w-[var(--public-max)]",
              layout === "centered" ? "flex flex-col items-center" : "",
            )}
          >
            {dateEl && layout !== "vertical" ? (
              <div className="mb-3">{dateEl}</div>
            ) : null}
            <h1 className={titleClass}>{title}</h1>
            {daysEl ? <div className="mt-4">{daysEl}</div> : null}
            {cta}
          </div>
        )}
      </div>
    </section>
  );
}
