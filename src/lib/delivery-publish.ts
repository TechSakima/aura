import { normalizeGalleryDesign } from "@/lib/gallery-design";
import type { DownloadPinPolicy, Gallery, GalleryDesign } from "@/lib/types";

export type DeliveryPublishItem = {
  id: string;
  label: string;
  detail: string;
  done: boolean;
  action: "photos" | "design" | "live" | "email" | "pin";
};

export type DeliveryPublishInput = {
  gallery: Pick<
    Gallery,
    "status" | "coverPhotoUrl" | "clientEmailedAt"
  > & {
    design?: GalleryDesign | null;
    hasDownloadPin?: boolean;
  };
  photoCount: number;
  pinPolicy?: DownloadPinPolicy;
  projectEmail?: string | null;
};

/**
 * Delivery go-live checklist (AURA-255) — photos, PIN, cover, layout, live, email.
 */
export function deliveryPublishItems(
  input: DeliveryPublishInput,
): DeliveryPublishItem[] {
  const { gallery, photoCount, pinPolicy = "required", projectEmail } = input;
  const design = normalizeGalleryDesign(gallery.design);
  const photosDone = photoCount > 0;
  const pinDone =
    pinPolicy === "optional" || Boolean(gallery.hasDownloadPin);
  const coverDone = Boolean(
    gallery.coverPhotoUrl || design.cover.photoId || design.coverPhotoId,
  );
  const designDone = Boolean(design.themeId);
  const liveDone =
    gallery.status === "live" ||
    gallery.status === "expired" ||
    gallery.status === "archived";
  const emailDone = Boolean(gallery.clientEmailedAt);
  const hasEmail = Boolean(projectEmail?.trim());

  return [
    {
      id: "photos",
      label: "Photos",
      detail: photosDone
        ? `${photoCount} uploaded`
        : "Upload gallery photos",
      done: photosDone,
      action: "photos",
    },
    {
      id: "pin",
      label: "Download PIN",
      detail: pinDone
        ? pinPolicy === "optional" && !gallery.hasDownloadPin
          ? "Optional — not set"
          : "PIN set"
        : "Set a 4-digit PIN",
      done: pinDone,
      action: "pin",
    },
    {
      id: "cover",
      label: "Cover",
      detail: coverDone ? "Cover photo chosen" : "Choose a cover photo",
      done: coverDone,
      action: "design",
    },
    {
      id: "design",
      label: "Layout",
      detail: designDone ? "Design ready" : "Apply a layout preset",
      done: designDone,
      action: "design",
    },
    {
      id: "live",
      label: "Go live",
      detail: liveDone
        ? gallery.status === "live"
          ? "Gallery is live"
          : `Status: ${gallery.status}`
        : "Publish when ready",
      done: liveDone,
      action: "live",
    },
    {
      id: "email",
      label: "Email client",
      detail: emailDone
        ? "Link sent"
        : hasEmail
          ? "Send gallery link"
          : "Add project email first",
      done: emailDone,
      action: "email",
    },
  ];
}

export function deliveryPublishDoneCount(items: DeliveryPublishItem[]): {
  done: number;
  total: number;
  complete: boolean;
} {
  const done = items.filter((i) => i.done).length;
  return { done, total: items.length, complete: done === items.length };
}
