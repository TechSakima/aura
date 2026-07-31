"use client";

import type { CSSProperties, ImgHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { isPlaceholderAspect } from "@/lib/images/dimensions";
import {
  galleryThumbSizes,
  galleryThumbSrcSet,
} from "@/lib/media-url";
import type { MediaGridMode } from "@/lib/media-grid";

/** Default reserve when metadata missing — reduces masonry CLS (AURA-412). */
const FALLBACK_ASPECT = 0.8; // 4:5

type GalleryThumbProps = {
  src: string;
  thumbSrc?: string | null;
  alt: string;
  /** width/height ratio (w/h). */
  aspect?: number | null;
  width?: number | null;
  height?: number | null;
  gridMode?: MediaGridMode;
  /** Override auto sizes from gridMode. */
  sizes?: string;
  /**
   * When true, skip inline aspectRatio — caller supplies CSS aspect
   * (columns / diary fixed crops).
   */
  cssAspect?: boolean;
  className?: string;
  style?: CSSProperties;
  onLoad?: ImgHTMLAttributes<HTMLImageElement>["onLoad"];
};

/**
 * Gallery grid / album thumb — reserved aspect + responsive srcSet/sizes (AURA-412).
 * Prefer over bare `<img>` on public gallery surfaces.
 */
export function GalleryThumb({
  src,
  thumbSrc,
  alt,
  aspect,
  width,
  height,
  gridMode = "masonry",
  sizes: sizesProp,
  cssAspect = false,
  className,
  style,
  onLoad,
}: GalleryThumbProps) {
  const displaySrc = thumbSrc || src;
  const srcSet = galleryThumbSrcSet(thumbSrc, src);
  const sizes = sizesProp || galleryThumbSizes(gridMode);

  const knownAspect =
    !isPlaceholderAspect(aspect) && aspect
      ? aspect
      : width && height && width > 0 && height > 0
        ? width / height
        : null;

  const reservedAspect = knownAspect ?? FALLBACK_ASPECT;
  const hasIntrinsic =
    typeof width === "number" &&
    typeof height === "number" &&
    width > 0 &&
    height > 0;

  return (
    // eslint-disable-next-line @next/next/no-img-element -- signed / proxied media URLs
    <img
      src={displaySrc}
      srcSet={srcSet}
      sizes={sizes}
      alt={alt}
      width={hasIntrinsic ? width! : undefined}
      height={hasIntrinsic ? height! : undefined}
      loading="lazy"
      decoding="async"
      className={cn("block w-full object-cover", className)}
      style={{
        ...(cssAspect ? {} : { aspectRatio: String(reservedAspect) }),
        ...style,
      }}
      onLoad={onLoad}
    />
  );
}
