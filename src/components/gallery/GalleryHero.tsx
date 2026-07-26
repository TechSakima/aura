"use client";

import { useEffect, useState } from "react";
import { StudioMark } from "@/components/brand/StudioMark";
import { cn } from "@/lib/cn";

export function GalleryHero({
  images,
  studioName,
  studioLogoUrl,
  clientName,
  title,
  daysLeft,
}: {
  images: string[];
  studioName: string;
  studioLogoUrl?: string;
  clientName?: string | null;
  title: string;
  daysLeft?: number | null;
}) {
  const slides = images.length ? images : [];
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (slides.length < 2) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, 5200);
    return () => window.clearInterval(id);
  }, [slides.length]);

  return (
    <section className="relative min-h-[78vh] w-full overflow-hidden bg-ink text-surface sm:min-h-[88vh]">
      {slides.length ? (
        slides.map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={`${src}-${i}`}
            src={src}
            alt=""
            className={cn(
              "absolute inset-0 h-full w-full object-cover transition-opacity duration-[1400ms] ease-out",
              i === index ? "opacity-100" : "opacity-0",
            )}
          />
        ))
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-ink via-ink to-accent/30" />
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/35 to-ink/25" />

      <div className="relative z-10 flex min-h-[78vh] flex-col justify-end px-5 pb-14 pt-10 sm:min-h-[88vh] sm:px-10 sm:pb-16">
        <div className="mx-auto w-full max-w-[var(--shell-max)] animate-enter">
          <StudioMark logoUrl={studioLogoUrl} name={studioName} tone="light" />

          {clientName ? (
            <p className="mb-2 text-sm text-surface/80">For {clientName}</p>
          ) : null}

          <h1 className="font-display text-4xl tracking-tight sm:text-6xl md:text-7xl">
            {title}
          </h1>

          {daysLeft != null && daysLeft >= 0 ? (
            <p className="mt-4 text-sm text-surface/75">
              {daysLeft === 0
                ? "Last day to download"
                : `${daysLeft} day${daysLeft === 1 ? "" : "s"} left to download`}
            </p>
          ) : null}
        </div>
      </div>

      {slides.length > 1 ? (
        <div className="absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Show image ${i + 1}`}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === index ? "w-6 bg-surface" : "w-1.5 bg-surface/40",
              )}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
