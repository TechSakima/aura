import { studioContactPrefs } from "@/lib/contact-prefs";
import { publicStudioTheme } from "@/lib/gallery-brand";
import type { Gallery, Studio, StudioTheme } from "@/lib/types";
import { resolveBrowseMediaUrl } from "@/lib/media-url-server";

/** Soft guest payload when gallery isn’t publicly viewable (AURA-250). */
export type PublicGalleryUnavailable = {
  unavailable: true;
  reason: "draft" | "expired" | "archived";
  gallery: {
    title: string;
    status: Gallery["status"];
    design?: Gallery["design"];
  };
  studio: {
    name: string;
    logoUrl?: string;
    ownerEmail?: string;
    phone?: string;
    theme: StudioTheme;
    showGalleryContactForm?: boolean;
  };
  photos: [];
  subAlbums: [];
  comments: [];
};

export async function publicStudioContact(studio: Studio) {
  return {
    name: studio.name,
    logoUrl: await resolveBrowseMediaUrl(studio.logoUrl),
    ownerEmail: studio.ownerEmail,
    phone: studio.phone,
    theme: publicStudioTheme(studio),
    showGalleryContactForm: studioContactPrefs(studio).showGalleryContactForm,
  };
}

export async function publicGalleryUnavailablePayload(
  gallery: Pick<Gallery, "title" | "status" | "design">,
  studio: Studio,
  reason: "draft" | "expired" | "archived",
): Promise<PublicGalleryUnavailable> {
  return {
    unavailable: true,
    reason,
    gallery: {
      title: gallery.title,
      status: gallery.status,
      design: gallery.design,
    },
    studio: await publicStudioContact(studio),
    photos: [],
    subAlbums: [],
    comments: [],
  };
}
