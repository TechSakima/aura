import Link from "next/link";
import { MediaGrid } from "@/components/media/MediaGrid";
import { HomepageCoverImage } from "@/components/public/homepage/HomepageCoverImage";
import { cn } from "@/lib/cn";
import { homepageLayoutToMediaMode } from "@/lib/media-grid";
import type { HomepageGalleryCard } from "@/lib/homepage-payload";
import type { HomepageCollectionsLayout } from "@/lib/types";

/**
 * Homepage collections — shared MediaGrid engine where applicable (AURA-246).
 * list + cinematic remain homepage-specific presentations.
 */
export function HomepageCollections({
  layout,
  galleries,
}: {
  layout: HomepageCollectionsLayout;
  galleries: HomepageGalleryCard[];
}) {
  if (galleries.length === 0) {
    return (
      <section className="shell-pad mx-auto max-w-[var(--public-max)] py-14 sm:py-16">
        <p className="text-center text-muted">No collections yet.</p>
      </section>
    );
  }

  if (layout === "list") {
    return (
      <section className="shell-pad mx-auto max-w-[var(--public-max)] py-14 sm:py-16">
        <ul className="divide-y divide-line border-y border-line">
          {galleries.map((g) => (
            <li key={g.token}>
              <Link
                href={`/g/${g.token}`}
                className="flex min-h-11 items-center gap-4 py-4 no-underline"
              >
                <div className="h-16 w-16 shrink-0 overflow-hidden bg-line sm:h-20 sm:w-20">
                  <HomepageCoverImage
                    gallery={g}
                    layout="list"
                    className="h-full w-full"
                  />
                </div>
                <p className="font-sans text-sm font-medium uppercase tracking-[0.12em] text-ink">
                  {g.title}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  if (layout === "cinematic") {
    return (
      <section className="relative py-14 sm:py-16">
        <ul
          className={cn(
            "flex gap-3 overflow-x-auto overscroll-x-contain snap-x snap-mandatory",
            "scroll-px-5 px-5 pb-3 sm:gap-4 sm:scroll-px-10 sm:px-10",
            "[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          )}
        >
          {galleries.map((g) => (
            <li
              key={g.token}
              className="w-[min(78vw,22rem)] shrink-0 snap-start sm:w-[min(42vw,26rem)]"
            >
              <Link href={`/g/${g.token}`} className="block no-underline">
                <div className="overflow-hidden bg-line">
                  {g.coverThumbUrl || g.coverPhotoUrl ? (
                    <HomepageCoverImage
                      gallery={g}
                      layout="cinematic"
                      className="aspect-[3/4] w-full transition duration-emphasis hover:scale-[1.02]"
                    />
                  ) : (
                    <div className="aspect-[3/4] bg-line" />
                  )}
                </div>
                <p className="mt-3 font-sans text-sm font-medium uppercase tracking-[0.12em] text-ink">
                  {g.title}
                </p>
              </Link>
            </li>
          ))}
        </ul>
        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-canvas to-transparent sm:w-16"
          aria-hidden
        />
      </section>
    );
  }

  const mode = homepageLayoutToMediaMode(layout) || "masonry";
  const coverLayout =
    mode === "columns" || layout === "grid" ? "grid" : "masonry";

  return (
    <section
      className={cn(
        "py-14 sm:py-16",
        mode === "diary"
          ? ""
          : "shell-pad mx-auto max-w-[var(--public-max)]",
      )}
    >
      <MediaGrid
        mode={mode}
        items={galleries}
        getKey={(g) => g.token}
        className={
          mode === "diary"
            ? "gap-10 sm:gap-14"
            : mode === "justified"
              ? "gap-3 sm:gap-4"
              : "gap-4 sm:gap-5"
        }
        renderItem={(g, ctx) => (
          <Link
            href={`/g/${g.token}`}
            className={cn(
              "block no-underline",
              ctx.itemClassName,
              mode === "masonry" && "mb-4 sm:mb-5",
              mode === "justified" && "min-w-[140px] sm:min-w-[180px]",
            )}
            style={{ animationDelay: ctx.animationDelay }}
          >
            <div className="overflow-hidden bg-line">
              {g.coverThumbUrl || g.coverPhotoUrl ? (
                <HomepageCoverImage
                  gallery={g}
                  layout={coverLayout}
                  className={cn(
                    "w-full transition duration-emphasis hover:scale-[1.02]",
                    mode === "columns" || mode === "diary"
                      ? "aspect-[4/5]"
                      : mode === "justified"
                        ? "h-full min-h-[10rem] object-cover"
                        : "h-auto",
                  )}
                />
              ) : (
                <div
                  className={cn(
                    "bg-line",
                    mode === "justified"
                      ? "h-full min-h-[10rem]"
                      : "aspect-[4/5]",
                  )}
                />
              )}
            </div>
            <p
              className={cn(
                "mt-3 font-sans text-sm font-medium uppercase tracking-[0.12em] text-ink",
                mode === "diary" && "text-center",
              )}
            >
              {g.title}
            </p>
          </Link>
        )}
      />
    </section>
  );
}
