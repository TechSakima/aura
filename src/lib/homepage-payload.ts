import {
  formatAddressLines,
  formatAddressQuery,
} from "@/lib/address";
import {
  enabledHomepageModules,
  ensureHomepageModules,
} from "@/lib/homepage-modules";
import {
  homepageCoverDerivativePaths,
  homepageCoverSrcSet,
} from "@/lib/media-url";
import { resolveBrowseMediaUrl } from "@/lib/media-url-server";
import { mapsHref, resolveSocialTreatment } from "@/lib/social";
import type {
  BrandSocialTreatment,
  Gallery,
  HomepageCollectionsLayout,
  SessionType,
  Studio,
  StudioHomepageModule,
} from "@/lib/types";
import { absoluteExternalUrl } from "@/lib/urls";

export type HomepageGalleryCard = {
  id: string;
  title: string;
  token: string;
  /** Large browse derivative (wm/web ~1800) — not originals */
  coverPhotoUrl?: string;
  /** Thumb browse derivative (~480) for cards (AURA-237) */
  coverThumbUrl?: string;
  /** `480w` / `1800w` srcset when both sizes resolve */
  coverSrcSet?: string;
};

async function resolveHomepageCoverCard(
  gallery: Gallery,
): Promise<HomepageGalleryCard> {
  const stored = gallery.coverPhotoUrl;
  const paths = homepageCoverDerivativePaths(stored);
  const [thumbUrl, largeUrl] = await Promise.all([
    paths.thumb ? resolveBrowseMediaUrl(paths.thumb) : Promise.resolve(undefined),
    paths.large
      ? resolveBrowseMediaUrl(paths.large)
      : resolveBrowseMediaUrl(stored),
  ]);
  return {
    id: gallery.id,
    title: gallery.title,
    token: gallery.publicToken,
    coverPhotoUrl: largeUrl || thumbUrl,
    coverThumbUrl: thumbUrl,
    coverSrcSet: homepageCoverSrcSet(thumbUrl, largeUrl),
  };
}

/** Why `/book` CTA is withheld (AURA-232). */
export type HomepageBookingBlockReason = "no_slug" | "no_session_types";

export type HomepagePayload = {
  studio: {
    name: string;
    logoUrl?: string;
    /** Brand cover / OG image for hero full-bleed + split (AURA-230) */
    coverImageUrl?: string;
    /** Bio copy when present; bio module decides visibility */
    biography?: string;
    website?: string;
    email?: string;
    phone?: string;
    /** Single-line address (legacy consumers) */
    address?: string;
    /** Multi-line postal address for contact display (AURA-233) */
    addressLines?: string[];
    mapsHref?: string;
    socialLinks?: { label: string; url: string }[];
    socialTreatment?: BrandSocialTreatment;
    theme?: Studio["theme"];
    /**
     * Live book URL when slug + active session types exist.
     * Omitted when booking would be a dead end (AURA-232).
     */
    bookingHref?: string;
    /** True when bookingHref is set */
    bookingReady?: boolean;
    /** Set when booking CTA is on but not ready — admin preview empty state */
    bookingBlockReason?: HomepageBookingBlockReason;
    /** Mirrors bookingCta module enabled / showBooking */
    showBooking?: boolean;
    showContactForm?: boolean;
    /** Public homepage slug for contact + book resolve (AURA-304). */
    slug?: string;
    layout?: HomepageCollectionsLayout;
  };
  galleries: HomepageGalleryCard[];
  /** Enabled modules in order (AURA-224). */
  modules: StudioHomepageModule[];
  featuredGallery?: HomepageGalleryCard | null;
};

/** Shared public + admin-preview homepage JSON (AURA-331 / AURA-224). */
export async function buildHomepagePayload(
  studio: Studio,
  galleries: Gallery[],
  sessionTypes: SessionType[] = [],
): Promise<HomepagePayload> {
  const hp = studio.homepage;
  if (!hp) {
    return {
      studio: { name: studio.name },
      galleries: [],
      modules: [],
      featuredGallery: null,
    };
  }

  ensureHomepageModules(hp);
  const modules = enabledHomepageModules(hp.modules);
  const collections = modules.find((m) => m.type === "collections");
  const sortOrder =
    collections?.type === "collections"
      ? collections.props.sortOrder
      : hp.sortOrder || "created_desc";
  const layout =
    collections?.type === "collections"
      ? collections.props.layout
      : hp.layout || "masonry";

  let listed = galleries.filter(
    (g) => g.showOnHomepage && g.status === "live",
  );
  if (sortOrder === "created_asc") {
    listed = listed.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  } else if (sortOrder === "title_asc") {
    listed = listed.sort((a, b) => a.title.localeCompare(b.title));
  } else {
    listed = listed.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  const logoUrl = await resolveBrowseMediaUrl(studio.logoUrl);
  const coverImageUrl = await resolveBrowseMediaUrl(
    studio.brandKit?.coverImageUrl || studio.defaultCoverImageUrl,
  );
  const galleryRows: HomepageGalleryCard[] = await Promise.all(
    listed.map((g) => resolveHomepageCoverCard(g)),
  );

  const featuredMod = modules.find((m) => m.type === "featuredGallery");
  let featuredGallery: HomepageGalleryCard | null = null;
  if (
    featuredMod?.type === "featuredGallery" &&
    featuredMod.props.galleryId
  ) {
    const g = galleries.find(
      (row) =>
        row.id === featuredMod.props.galleryId && row.status === "live",
    );
    if (g) {
      featuredGallery = await resolveHomepageCoverCard(g);
    }
  }

  const bookingOn = modules.some((m) => m.type === "bookingCta");
  const contact = modules.find((m) => m.type === "contact");
  const showForm =
    contact?.type === "contact"
      ? Boolean(contact.props.showContactForm)
      : Boolean(hp.showContactForm);

  const slug = (hp.slug || "").trim();
  const hasActiveTypes = sessionTypes.some((t) => t.active !== false);
  let bookingHref: string | undefined;
  let bookingReady = false;
  let bookingBlockReason: HomepageBookingBlockReason | undefined;
  if (slug && hasActiveTypes) {
    bookingHref = `/book/${slug}`;
    bookingReady = true;
  } else if (!slug) {
    bookingBlockReason = "no_slug";
  } else {
    bookingBlockReason = "no_session_types";
  }

  const addressLines = formatAddressLines(studio);
  const addressQuery = formatAddressQuery(addressLines);

  return {
    studio: {
      name: studio.name,
      logoUrl,
      coverImageUrl: coverImageUrl || undefined,
      biography: hp.biography || studio.brandTagline || undefined,
      website: absoluteExternalUrl(studio.website) || studio.website,
      email: studio.ownerEmail || undefined,
      phone: studio.phone || undefined,
      address: addressQuery || undefined,
      addressLines: addressLines.length ? addressLines : undefined,
      mapsHref: mapsHref(addressQuery),
      socialLinks: (studio.socialLinks || []).map((s) => ({
        label: s.label,
        url: absoluteExternalUrl(s.url) || s.url,
      })),
      socialTreatment: resolveSocialTreatment(
        studio.brandKit?.socialTreatment,
      ),
      theme: studio.theme,
      showBooking: bookingOn,
      showContactForm: showForm,
      slug: slug || undefined,
      layout,
      bookingHref,
      bookingReady,
      bookingBlockReason: bookingReady ? undefined : bookingBlockReason,
    },
    galleries: galleryRows,
    modules,
    featuredGallery,
  };
}
