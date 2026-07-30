import { cn } from "@/lib/cn";
import type { HomepageGalleryCard } from "@/lib/homepage-payload";

type Layout = "list" | "grid" | "masonry" | "cinematic" | "featured";

const SIZES: Record<Layout, string> = {
  list: "80px",
  grid: "(max-width: 640px) 92vw, (max-width: 1024px) 45vw, 30vw",
  masonry: "(max-width: 640px) 92vw, (max-width: 1024px) 45vw, 30vw",
  cinematic: "(max-width: 640px) 78vw, 26rem",
  featured: "(max-width: 640px) 92vw, min(87.5rem, 92vw)",
};

/** Responsive gallery cover — thumb-first srcset, never originals (AURA-237). */
export function HomepageCoverImage({
  gallery,
  layout,
  className,
  loading = "lazy",
}: {
  gallery: Pick<
    HomepageGalleryCard,
    "coverPhotoUrl" | "coverThumbUrl" | "coverSrcSet"
  >;
  layout: Layout;
  className?: string;
  loading?: "lazy" | "eager";
}) {
  const src = gallery.coverThumbUrl || gallery.coverPhotoUrl;
  if (!src) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      srcSet={gallery.coverSrcSet}
      sizes={gallery.coverSrcSet ? SIZES[layout] : undefined}
      alt=""
      loading={loading}
      decoding="async"
      className={cn("object-cover", className)}
    />
  );
}
