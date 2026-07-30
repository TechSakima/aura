import type {
  GalleryCoverModule,
  GalleryCoverStyle,
  GalleryHeroLayout,
} from "@/lib/types";

/**
 * Cover treatments library (AURA-244).
 * Each treatment sets cover.style and optional layout/scrim defaults.
 */
export type CoverTreatmentId = GalleryCoverStyle;

export type CoverTreatment = {
  id: CoverTreatmentId;
  label: string;
  detail: string;
  style: GalleryCoverStyle;
  /** Applied when picking the treatment (photo/focal preserved). */
  coverDefaults?: Partial<
    Pick<
      GalleryCoverModule,
      | "layout"
      | "titleTreatment"
      | "scrim"
      | "showDate"
      | "showDaysLeft"
      | "showCta"
    >
  >;
};

export const COVER_TREATMENTS: CoverTreatment[] = [
  {
    id: "full",
    label: "Full",
    detail: "Standard hero height",
    style: "full",
  },
  {
    id: "third",
    label: "Third",
    detail: "Compact cover band",
    style: "third",
  },
  {
    id: "none",
    label: "None",
    detail: "Title block only",
    style: "none",
  },
  {
    id: "immersive",
    label: "Immersive",
    detail: "Tall cover, strong scrim",
    style: "immersive",
    coverDefaults: {
      layout: "cinematic",
      scrim: "strong",
      showCta: true,
    },
  },
  {
    id: "split-title",
    label: "Split title",
    detail: "Title and CTA side by side",
    style: "split-title",
    coverDefaults: {
      layout: "split",
      titleTreatment: "sans-wide",
      showCta: true,
    },
  },
];

const BY_ID = Object.fromEntries(
  COVER_TREATMENTS.map((t) => [t.id, t]),
) as Record<CoverTreatmentId, CoverTreatment>;

const STYLE_SET = new Set<string>(COVER_TREATMENTS.map((t) => t.id));

export function isGalleryCoverStyle(value: unknown): value is GalleryCoverStyle {
  return typeof value === "string" && STYLE_SET.has(value);
}

export function resolveCoverTreatment(id?: string | null): CoverTreatment {
  if (id && isGalleryCoverStyle(id)) return BY_ID[id];
  return BY_ID.full;
}

/** Layout used at render time — split-title forces split. */
export function effectiveCoverLayout(
  cover: Pick<GalleryCoverModule, "style" | "layout">,
): GalleryHeroLayout {
  if (cover.style === "split-title") return "split";
  return cover.layout;
}

/** Focal presets for the cover photo (percent). */
export const COVER_FOCAL_PRESETS: { x: number; y: number; label: string }[] = [
  { x: 20, y: 20, label: "Top left" },
  { x: 50, y: 20, label: "Top" },
  { x: 80, y: 20, label: "Top right" },
  { x: 20, y: 50, label: "Left" },
  { x: 50, y: 50, label: "Center" },
  { x: 80, y: 50, label: "Right" },
  { x: 20, y: 80, label: "Bottom left" },
  { x: 50, y: 80, label: "Bottom" },
  { x: 80, y: 80, label: "Bottom right" },
];
