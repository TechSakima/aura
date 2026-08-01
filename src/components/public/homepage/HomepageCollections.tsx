import Link from "next/link";
import { MediaGrid } from "@/components/media/MediaGrid";
import { HomepageCoverImage } from "@/components/public/homepage/HomepageCoverImage";
import { EmptyState, ScrollRail } from "@/components/ui";
import { cn } from "@/lib/cn";
import { homepageLayoutToMediaMode } from "@/lib/media-grid";
import type { HomepageGalleryCard } from "@/lib/homepage-payload";
import type { HomepageCollectionsLayout } from "@/lib/types";

/**
 * Homepage collections — shared MediaGrid engine where applicable (AURA-246).
 * list + cinematic remain homepage-specific presentations.
 * Layout uses container queries / cqw so DeviceFramePreview phone mode is honest (AURA-439).
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
      <section className="shell-pad mx-auto max-w-[var(--public-max)] py-14 @sm:py-16">
        <EmptyState
          variant="inline"
          title="No collections yet."
          className="text-center"
        />
      </section>
    );
  }

  if (layout === "list") {
    return (
      <section className="shell-pad mx-auto max-w-[var(--public-max)] py-14 @sm:py-16">
        <ul className="divide-y divide-line border-y border-line">
          {galleries.map((g) => (
            <li key={g.token}>
              <Link
                href={`/g/${g.token}`}
                className="flex min-h-11 min-w-0 items-center gap-4 py-4 no-underline"
              >
                <div className="h-16 w-16 shrink-0 overflow-hidden bg-line @sm:h-20 @sm:w-20">
                  <HomepageCoverImage
                    gallery={g}
                    layout="list"
                    className="h-full w-full"
                  />
                </div>
                <p className="min-w-0 break-words font-sans text-sm font-medium uppercase tracking-[0.12em] text-ink">
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
      <section className="py-14 @sm:py-16">
        <ScrollRail
          fadeFrom="canvas"
          fadeWidthClass="w-12 @sm:w-16"
          aria-label="Collections"
          contentClassName={cn(
            /* L/R safe-area — bare px-5 skipped notch in landscape (AURA-450). */
            "gap-3 snap-x snap-mandatory pb-3",
            "scroll-pl-[max(var(--shell-gutter),var(--safe-inset-left))] scroll-pr-[max(var(--shell-gutter),var(--safe-inset-right))]",
            "pl-[max(var(--shell-gutter),var(--safe-inset-left))] pr-[max(var(--shell-gutter),var(--safe-inset-right))]",
            "@sm:gap-4",
            "@sm:scroll-pl-[max(2.5rem,var(--safe-inset-left))] @sm:scroll-pr-[max(2.5rem,var(--safe-inset-right))]",
            "@sm:pl-[max(2.5rem,var(--safe-inset-left))] @sm:pr-[max(2.5rem,var(--safe-inset-right))]",
          )}
        >
          {galleries.map((g) => (
            <div
              key={g.token}
              className="w-[min(78cqw,22rem)] shrink-0 snap-start @sm:w-[min(42cqw,26rem)]"
            >
              <Link href={`/g/${g.token}`} className="block min-w-0 no-underline">
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
                <p className="mt-3 break-words font-sans text-sm font-medium uppercase tracking-[0.12em] text-ink">
                  {g.title}
                </p>
              </Link>
            </div>
          ))}
        </ScrollRail>
      </section>
    );
  }

  const mode = homepageLayoutToMediaMode(layout) || "masonry";
  const coverLayout =
    mode === "columns" || layout === "grid" ? "grid" : "masonry";

  return (
    <section
      className={cn(
        "py-14 @sm:py-16",
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
            ? "gap-10 @sm:gap-14"
            : mode === "justified"
              ? "gap-3 @sm:gap-4"
              : "gap-4 @sm:gap-5"
        }
        renderItem={(g, ctx) => (
          <Link
            href={`/g/${g.token}`}
            className={cn(
              "block no-underline",
              ctx.itemClassName,
              mode === "masonry" && "mb-4 @sm:mb-5",
              mode === "justified" && "min-w-0 @sm:min-w-[180px]",
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
                "mt-3 max-w-full break-words font-sans text-sm font-medium uppercase tracking-[0.12em] text-ink",
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
