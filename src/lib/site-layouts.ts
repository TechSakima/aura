import type { FontPresetId, StudioHomepageModule } from "@/lib/types";
import {
  resolveStudioThemePreset,
  studioThemeFromPreset,
  type StudioThemePreset,
} from "@/lib/themes";

/** Starter site layouts — module arrangement + brand kit (AURA-229). */
export type SiteLayoutId = "editorial" | "minimal" | "portfolio" | "bold";

export type SiteLayoutTemplate = {
  id: SiteLayoutId;
  label: string;
  detail: string;
  themePresetId: string;
  fontPreset: FontPresetId;
  modules: StudioHomepageModule[];
};

const CONTACT_LIGHT = {
  showEmail: true,
  showPhone: false,
  showAddress: false,
  showWebsite: true,
  showSocialLinks: true,
  showContactForm: false,
} as const;

const CONTACT_FULL = {
  showEmail: true,
  showPhone: true,
  showAddress: false,
  showWebsite: true,
  showSocialLinks: true,
  showContactForm: false,
} as const;

export const SITE_LAYOUT_TEMPLATES: SiteLayoutTemplate[] = [
  {
    id: "editorial",
    label: "Editorial",
    detail: "Story first — bio, list collections, featured",
    themePresetId: "sand",
    fontPreset: "editorial",
    modules: [
      {
        id: "mod-hero",
        type: "hero",
        enabled: true,
        props: {
          variant: "type",
          showLogo: false,
          showName: true,
          showCta: false,
        },
      },
      {
        id: "mod-bio",
        type: "bio",
        enabled: true,
        props: {} as Record<string, never>,
      },
      {
        id: "mod-collections",
        type: "collections",
        enabled: true,
        props: { layout: "list", sortOrder: "created_desc" },
      },
      {
        id: "mod-featured",
        type: "featuredGallery",
        enabled: true,
        props: {},
      },
      {
        id: "mod-contact",
        type: "contact",
        enabled: true,
        props: { ...CONTACT_LIGHT },
      },
      {
        id: "mod-booking",
        type: "bookingCta",
        enabled: true,
        props: {} as Record<string, never>,
      },
      {
        id: "mod-links",
        type: "customLinks",
        enabled: false,
        props: { links: [] },
      },
      {
        id: "mod-footer",
        type: "footer",
        enabled: true,
        props: { showStudioName: true, showSocialLinks: false },
      },
    ],
  },
  {
    id: "minimal",
    label: "Minimal",
    detail: "Hero, portfolio grid, booking",
    themePresetId: "linen",
    fontPreset: "sans",
    modules: [
      {
        id: "mod-hero",
        type: "hero",
        enabled: true,
        props: {
          variant: "lockup",
          showLogo: true,
          showName: true,
          showCta: false,
        },
      },
      {
        id: "mod-collections",
        type: "collections",
        enabled: true,
        props: { layout: "grid", sortOrder: "created_desc" },
      },
      {
        id: "mod-booking",
        type: "bookingCta",
        enabled: true,
        props: {} as Record<string, never>,
      },
      {
        id: "mod-bio",
        type: "bio",
        enabled: false,
        props: {} as Record<string, never>,
      },
      {
        id: "mod-featured",
        type: "featuredGallery",
        enabled: false,
        props: {},
      },
      {
        id: "mod-contact",
        type: "contact",
        enabled: false,
        props: { ...CONTACT_LIGHT },
      },
      {
        id: "mod-links",
        type: "customLinks",
        enabled: false,
        props: { links: [] },
      },
      {
        id: "mod-footer",
        type: "footer",
        enabled: true,
        props: { showStudioName: true, showSocialLinks: false },
      },
    ],
  },
  {
    id: "portfolio",
    label: "Portfolio",
    detail: "Masonry collections with featured gallery",
    themePresetId: "olive",
    fontPreset: "display",
    modules: [
      {
        id: "mod-hero",
        type: "hero",
        enabled: true,
        props: {
          variant: "fullBleed",
          showLogo: true,
          showName: true,
          showCta: true,
        },
      },
      {
        id: "mod-collections",
        type: "collections",
        enabled: true,
        props: { layout: "masonry", sortOrder: "created_desc" },
      },
      {
        id: "mod-featured",
        type: "featuredGallery",
        enabled: true,
        props: {},
      },
      {
        id: "mod-bio",
        type: "bio",
        enabled: true,
        props: {} as Record<string, never>,
      },
      {
        id: "mod-booking",
        type: "bookingCta",
        enabled: true,
        props: {} as Record<string, never>,
      },
      {
        id: "mod-contact",
        type: "contact",
        enabled: true,
        props: { ...CONTACT_FULL },
      },
      {
        id: "mod-links",
        type: "customLinks",
        enabled: false,
        props: { links: [] },
      },
      {
        id: "mod-footer",
        type: "footer",
        enabled: true,
        props: { showStudioName: true, showSocialLinks: true },
      },
    ],
  },
  {
    id: "bold",
    label: "Bold",
    detail: "Booking forward, dark kit, links on",
    themePresetId: "noir",
    fontPreset: "modern",
    modules: [
      {
        id: "mod-hero",
        type: "hero",
        enabled: true,
        props: {
          variant: "split",
          showLogo: true,
          showName: true,
          showCta: true,
        },
      },
      {
        id: "mod-booking",
        type: "bookingCta",
        enabled: true,
        props: {} as Record<string, never>,
      },
      {
        id: "mod-collections",
        type: "collections",
        enabled: true,
        props: { layout: "cinematic", sortOrder: "created_desc" },
      },
      {
        id: "mod-bio",
        type: "bio",
        enabled: true,
        props: {} as Record<string, never>,
      },
      {
        id: "mod-contact",
        type: "contact",
        enabled: true,
        props: { ...CONTACT_FULL },
      },
      {
        id: "mod-links",
        type: "customLinks",
        enabled: true,
        props: { links: [] },
      },
      {
        id: "mod-featured",
        type: "featuredGallery",
        enabled: false,
        props: {},
      },
      {
        id: "mod-footer",
        type: "footer",
        enabled: true,
        props: { showStudioName: true, showSocialLinks: true },
      },
    ],
  },
];

const BY_ID = Object.fromEntries(
  SITE_LAYOUT_TEMPLATES.map((t) => [t.id, t]),
) as Record<SiteLayoutId, SiteLayoutTemplate>;

export function isSiteLayoutId(value: unknown): value is SiteLayoutId {
  return typeof value === "string" && value in BY_ID;
}

export function resolveSiteLayout(id: SiteLayoutId): SiteLayoutTemplate {
  return BY_ID[id];
}

/** Deep-clone template modules so builder edits do not mutate the catalog. */
export function cloneSiteLayoutModules(
  template: SiteLayoutTemplate,
): StudioHomepageModule[] {
  return structuredClone(template.modules);
}

export function siteLayoutThemePreset(
  template: SiteLayoutTemplate,
): StudioThemePreset {
  return resolveStudioThemePreset({ presetId: template.themePresetId });
}

export function siteLayoutTheme(template: SiteLayoutTemplate) {
  return studioThemeFromPreset(
    siteLayoutThemePreset(template),
    template.fontPreset,
  );
}
