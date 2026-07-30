import type {
  GalleryCoverStyle,
  GalleryGridMode,
  GalleryThemeId,
  Studio,
  StudioDeliveryDefaults,
} from "@/lib/types";
import { isGalleryCoverStyle } from "@/lib/gallery-cover-treatments";
import { DEFAULT_GALLERY_DESIGN } from "@/lib/types";
import { isGalleryThemeId } from "@/lib/themes";

export const DEFAULT_EXPIRY_DAYS = 60;

export const DEFAULT_DELIVERY_DEFAULTS: StudioDeliveryDefaults = {
  commentsEnabled: false,
  watermarkEnabled: true,
  expiryDays: DEFAULT_EXPIRY_DAYS,
  selectLimit: undefined,
  downloadPinPolicy: "required",
  coverStyle: DEFAULT_GALLERY_DESIGN.coverStyle,
  themeId: DEFAULT_GALLERY_DESIGN.themeId,
  gridMode: DEFAULT_GALLERY_DESIGN.gridMode,
};

const GRID_MODES = new Set<GalleryGridMode>([
  "masonry",
  "justified",
  "columns",
  "diary",
]);

export function clampExpiryDays(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return DEFAULT_EXPIRY_DAYS;
  return Math.min(3650, Math.max(1, Math.round(n)));
}

export function normalizeDeliveryDefaults(
  raw?: Partial<StudioDeliveryDefaults> | null | Record<string, unknown>,
): StudioDeliveryDefaults {
  const incoming = (raw || {}) as Partial<StudioDeliveryDefaults> & {
    selectLimit?: number | null | string;
  };
  const base = { ...DEFAULT_DELIVERY_DEFAULTS, ...incoming };
  const themeId = isGalleryThemeId(base.themeId)
    ? base.themeId
    : DEFAULT_GALLERY_DESIGN.themeId;
  const coverStyle = isGalleryCoverStyle(base.coverStyle)
    ? base.coverStyle
    : DEFAULT_GALLERY_DESIGN.coverStyle;
  const gridMode = GRID_MODES.has(base.gridMode as GalleryGridMode)
    ? (base.gridMode as GalleryGridMode)
    : DEFAULT_GALLERY_DESIGN.gridMode;
  let selectLimit: number | undefined;
  const selectRaw = incoming.selectLimit as unknown;
  if (selectRaw != null && String(selectRaw).trim() !== "") {
    const n = Math.round(Number(selectRaw));
    if (Number.isFinite(n) && n >= 1) selectLimit = n;
  }
  return {
    commentsEnabled: Boolean(base.commentsEnabled),
    watermarkEnabled: base.watermarkEnabled !== false,
    expiryDays: clampExpiryDays(base.expiryDays),
    selectLimit,
    downloadPinPolicy:
      base.downloadPinPolicy === "optional" ? "optional" : "required",
    coverStyle,
    themeId: themeId as GalleryThemeId,
    gridMode,
  };
}

export function studioDeliveryDefaults(studio: Studio): StudioDeliveryDefaults {
  return normalizeDeliveryDefaults(studio.deliveryDefaults);
}

export function galleryExpiryFromNow(
  expiryDays: number,
  from: Date = new Date(),
): string {
  const days = clampExpiryDays(expiryDays);
  return new Date(from.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
}
