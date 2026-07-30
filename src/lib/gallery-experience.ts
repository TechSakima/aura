import type {
  GalleryDensityPreference,
  GalleryDesign,
  GalleryMotionPreference,
} from "@/lib/types";

export function asGalleryMotion(
  value: unknown,
  fallback: GalleryMotionPreference = "system",
): GalleryMotionPreference {
  return value === "full" || value === "reduced" || value === "system"
    ? value
    : fallback;
}

export function asGalleryDensity(
  value: unknown,
  fallback: GalleryDensityPreference = "comfortable",
): GalleryDensityPreference {
  return value === "compact" ||
    value === "comfortable" ||
    value === "airy"
    ? value
    : fallback;
}

/**
 * Grid enter animation — off for design “reduced” or OS prefers-reduced-motion (AURA-257).
 */
export function galleryShouldEnterMotion(
  motion: GalleryMotionPreference,
  prefersReducedMotion = false,
): boolean {
  if (prefersReducedMotion || motion === "reduced") return false;
  return true;
}

/** Stagger between tile enters — longer for cinematic; 0 when motion is off. */
export function galleryEnterStaggerMs(
  motion: GalleryMotionPreference,
  prefersReducedMotion = false,
): number {
  if (prefersReducedMotion || motion === "reduced") return 0;
  if (motion === "full") return 55;
  return 40;
}

/** Screen-reader label when gallery view mode changes (AURA-257). */
export function galleryViewAnnouncement(
  view: "hub" | "favorites" | "peek",
  photoCount: number,
  opts?: { selectsMode?: boolean },
): string {
  const n = photoCount;
  const photos = `${n} photo${n === 1 ? "" : "s"}`;
  if (view === "favorites") {
    return opts?.selectsMode
      ? `Selects view, ${photos}`
      : `Favorites view, ${photos}`;
  }
  if (view === "peek") return `Sneak peek, ${photos}`;
  return `All photos, ${photos}`;
}

/** data-* attrs for PublicShell / preview roots (AURA-252). */
export function galleryExperienceDataAttrs(
  design: Pick<GalleryDesign, "motion" | "density">,
): {
  "data-gallery-motion": GalleryMotionPreference;
  "data-gallery-density": GalleryDensityPreference;
} {
  return {
    "data-gallery-motion": asGalleryMotion(design.motion),
    "data-gallery-density": asGalleryDensity(design.density),
  };
}
