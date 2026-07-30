import type {
  HomepageCollectionsLayout,
  HomepageHeroVariant,
  HomepageModuleType,
  HomepageSortOrder,
  StudioHomepageModule,
  StudioHomepageSettings,
} from "@/lib/types";

export const HOMEPAGE_MODULE_TYPES: readonly HomepageModuleType[] = [
  "hero",
  "bio",
  "collections",
  "featuredGallery",
  "contact",
  "bookingCta",
  "customLinks",
  "footer",
] as const;

export const HOMEPAGE_MODULE_LABELS: Record<HomepageModuleType, string> = {
  hero: "Hero",
  bio: "Bio",
  collections: "Collections",
  featuredGallery: "Featured gallery",
  contact: "Contact",
  bookingCta: "Booking",
  customLinks: "Custom links",
  footer: "Footer",
};

export const HOMEPAGE_HERO_VARIANTS: {
  id: HomepageHeroVariant;
  label: string;
}[] = [
  { id: "fullBleed", label: "Full bleed" },
  { id: "split", label: "Split" },
  { id: "type", label: "Type" },
  { id: "lockup", label: "Lockup" },
];

const MODULE_TYPE_SET = new Set<string>(HOMEPAGE_MODULE_TYPES);

export function isHomepageModuleType(
  value: unknown,
): value is HomepageModuleType {
  return typeof value === "string" && MODULE_TYPE_SET.has(value);
}

function newId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export const HOMEPAGE_COLLECTIONS_LAYOUTS: {
  id: HomepageCollectionsLayout;
  label: string;
}[] = [
  { id: "masonry", label: "Masonry" },
  { id: "justified", label: "Justified" },
  { id: "columns", label: "Columns" },
  { id: "diary", label: "Diary" },
  { id: "grid", label: "Grid" },
  { id: "list", label: "List" },
  { id: "cinematic", label: "Cinematic" },
];

export function asLayout(value: unknown): HomepageCollectionsLayout {
  return value === "grid" ||
    value === "list" ||
    value === "masonry" ||
    value === "justified" ||
    value === "columns" ||
    value === "diary" ||
    value === "cinematic"
    ? value
    : "masonry";
}

function asSortOrder(value: unknown): HomepageSortOrder {
  return value === "created_asc" ||
    value === "title_asc" ||
    value === "created_desc"
    ? value
    : "created_desc";
}

export function asHeroVariant(value: unknown): HomepageHeroVariant {
  return value === "fullBleed" ||
    value === "split" ||
    value === "type" ||
    value === "lockup"
    ? value
    : "lockup";
}

/** Canonical order for new studios (AURA-223). */
export function defaultHomepageModules(
  hp?: Partial<StudioHomepageSettings> | null,
): StudioHomepageModule[] {
  const layout = asLayout(hp?.layout);
  const sortOrder = asSortOrder(hp?.sortOrder);
  const showBio = hp?.showBiography !== false;
  const showBooking = hp?.showBooking !== false;
  const showEmail = hp?.showEmail !== false;
  const showPhone = hp?.showPhone !== false;
  const showAddress = Boolean(hp?.showAddress);
  const showWebsite = hp?.showWebsite !== false;
  const showSocial = hp?.showSocialLinks !== false;
  const showForm = Boolean(hp?.showContactForm);
  const contactOn =
    showEmail ||
    showPhone ||
    showAddress ||
    showWebsite ||
    showSocial ||
    showForm;

  return [
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
      id: "mod-bio",
      type: "bio",
      enabled: showBio,
      props: {} as Record<string, never>,
    },
    {
      id: "mod-collections",
      type: "collections",
      enabled: true,
      props: { layout, sortOrder },
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
      enabled: contactOn,
      props: {
        showEmail,
        showPhone,
        showAddress,
        showWebsite,
        showSocialLinks: showSocial,
        showContactForm: showForm,
      },
    },
    {
      id: "mod-booking",
      type: "bookingCta",
      enabled: showBooking,
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
      enabled: false,
      props: { showStudioName: true, showSocialLinks: false },
    },
  ];
}

/**
 * Migrate toggle-era homepages preserving today's visual order:
 * Hero → Bio → Contact → BookingCta → Collections → (off) Featured → Links → Footer
 */
export function modulesFromHomepageToggles(
  hp: StudioHomepageSettings,
): StudioHomepageModule[] {
  const layout = asLayout(hp.layout);
  const sortOrder = asSortOrder(hp.sortOrder);
  const showBio = hp.showBiography !== false;
  const showBooking = hp.showBooking !== false;
  const showEmail = hp.showEmail !== false;
  const showPhone = hp.showPhone !== false;
  const showAddress = Boolean(hp.showAddress);
  const showWebsite = hp.showWebsite !== false;
  const showSocial = hp.showSocialLinks !== false;
  const showForm = Boolean(hp.showContactForm);
  const contactOn =
    showEmail ||
    showPhone ||
    showAddress ||
    showWebsite ||
    showSocial ||
    showForm;

  return [
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
      id: "mod-bio",
      type: "bio",
      enabled: showBio,
      props: {} as Record<string, never>,
    },
    {
      id: "mod-contact",
      type: "contact",
      enabled: contactOn,
      props: {
        showEmail,
        showPhone,
        showAddress,
        showWebsite,
        showSocialLinks: showSocial,
        showContactForm: showForm,
      },
    },
    {
      id: "mod-booking",
      type: "bookingCta",
      enabled: showBooking,
      props: {} as Record<string, never>,
    },
    {
      id: "mod-collections",
      type: "collections",
      enabled: true,
      props: { layout, sortOrder },
    },
    {
      id: "mod-featured",
      type: "featuredGallery",
      enabled: false,
      props: {},
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
      enabled: false,
      props: { showStudioName: true, showSocialLinks: false },
    },
  ];
}

function normalizeOneModule(raw: unknown): StudioHomepageModule | null {
  if (!raw || typeof raw !== "object") return null;
  const m = raw as Record<string, unknown>;
  if (!isHomepageModuleType(m.type)) return null;
  const id =
    typeof m.id === "string" && m.id.trim() ? m.id.trim() : newId(`mod-${m.type}`);
  const enabled = m.enabled !== false;
  const props =
    m.props && typeof m.props === "object"
      ? (m.props as Record<string, unknown>)
      : {};

  switch (m.type) {
    case "hero": {
      const variant = asHeroVariant(props.variant);
      const showCtaDefault =
        variant === "fullBleed" || variant === "split";
      return {
        id,
        type: "hero",
        enabled,
        props: {
          variant,
          showLogo: props.showLogo !== false,
          showName: props.showName !== false,
          showCta:
            typeof props.showCta === "boolean"
              ? props.showCta
              : showCtaDefault,
        },
      };
    }
    case "bio":
      return { id, type: "bio", enabled, props: {} as Record<string, never> };
    case "collections":
      return {
        id,
        type: "collections",
        enabled,
        props: {
          layout: asLayout(props.layout),
          sortOrder: asSortOrder(props.sortOrder),
        },
      };
    case "featuredGallery":
      return {
        id,
        type: "featuredGallery",
        enabled,
        props: {
          galleryId:
            typeof props.galleryId === "string" && props.galleryId.trim()
              ? props.galleryId.trim()
              : undefined,
        },
      };
    case "contact":
      return {
        id,
        type: "contact",
        enabled,
        props: {
          showEmail: props.showEmail !== false,
          showPhone: props.showPhone !== false,
          showAddress: Boolean(props.showAddress),
          showWebsite: props.showWebsite !== false,
          showSocialLinks: props.showSocialLinks !== false,
          showContactForm: Boolean(props.showContactForm),
        },
      };
    case "bookingCta":
      return {
        id,
        type: "bookingCta",
        enabled,
        props: {} as Record<string, never>,
      };
    case "customLinks": {
      const linksRaw = Array.isArray(props.links) ? props.links : [];
      const links = linksRaw
        .map((row) => {
          if (!row || typeof row !== "object") return null;
          const r = row as Record<string, unknown>;
          const label = String(r.label || "").trim();
          const url = String(r.url || "").trim();
          if (!label || !url) return null;
          const linkId =
            typeof r.id === "string" && r.id.trim()
              ? r.id.trim()
              : newId("link");
          return { id: linkId, label, url };
        })
        .filter(Boolean) as { id: string; label: string; url: string }[];
      return {
        id,
        type: "customLinks",
        enabled,
        props: { links },
      };
    }
    case "footer":
      return {
        id,
        type: "footer",
        enabled,
        props: {
          showStudioName: props.showStudioName !== false,
          showSocialLinks: Boolean(props.showSocialLinks),
        },
      };
    default:
      return null;
  }
}

/** Drop unknown types; coerce known modules. Empty → migrate from toggles. */
export function normalizeHomepageModules(
  raw: unknown,
  hp: StudioHomepageSettings,
): StudioHomepageModule[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return modulesFromHomepageToggles(hp);
  }
  const out: StudioHomepageModule[] = [];
  for (const row of raw) {
    const mod = normalizeOneModule(row);
    if (mod) out.push(mod);
  }
  return out.length ? out : modulesFromHomepageToggles(hp);
}

/** Mirror modules → legacy toggles / layout for Settings + payload until AURA-224. */
export function syncHomepageTogglesFromModules(
  hp: StudioHomepageSettings,
): void {
  const modules = hp.modules || [];
  const bio = modules.find((m) => m.type === "bio");
  const contact = modules.find((m) => m.type === "contact");
  const booking = modules.find((m) => m.type === "bookingCta");
  const collections = modules.find((m) => m.type === "collections");

  if (bio) hp.showBiography = bio.enabled;
  if (booking) hp.showBooking = booking.enabled;
  if (collections && collections.type === "collections") {
    hp.layout = collections.props.layout;
    hp.sortOrder = collections.props.sortOrder;
  }
  if (contact && contact.type === "contact") {
    if (!contact.enabled) {
      hp.showEmail = false;
      hp.showPhone = false;
      hp.showAddress = false;
      hp.showWebsite = false;
      hp.showSocialLinks = false;
      hp.showContactForm = false;
    } else {
      const p = contact.props;
      hp.showEmail = p.showEmail;
      hp.showPhone = p.showPhone;
      hp.showAddress = p.showAddress;
      hp.showWebsite = p.showWebsite;
      hp.showSocialLinks = p.showSocialLinks;
      hp.showContactForm = p.showContactForm;
    }
  }
}

/** Apply toggle / layout patches onto the modules array. */
export function applyHomepageTogglePatchToModules(
  hp: StudioHomepageSettings,
  patch: Partial<StudioHomepageSettings>,
): void {
  const modules = [...(hp.modules || modulesFromHomepageToggles(hp))];

  const mapEnabled = (type: HomepageModuleType, enabled: boolean) => {
    const idx = modules.findIndex((m) => m.type === type);
    if (idx < 0) return;
    modules[idx] = { ...modules[idx], enabled } as StudioHomepageModule;
  };

  if ("showBiography" in patch && typeof patch.showBiography === "boolean") {
    mapEnabled("bio", patch.showBiography);
  }
  if ("showBooking" in patch && typeof patch.showBooking === "boolean") {
    mapEnabled("bookingCta", patch.showBooking);
  }
  if (
    "showContactForm" in patch ||
    "showEmail" in patch ||
    "showPhone" in patch ||
    "showAddress" in patch ||
    "showWebsite" in patch ||
    "showSocialLinks" in patch
  ) {
    const idx = modules.findIndex((m) => m.type === "contact");
    const cur = idx >= 0 ? modules[idx] : null;
    if (cur && cur.type === "contact") {
      const nextProps = { ...cur.props };
      if (typeof patch.showEmail === "boolean") nextProps.showEmail = patch.showEmail;
      if (typeof patch.showPhone === "boolean") nextProps.showPhone = patch.showPhone;
      if (typeof patch.showAddress === "boolean") {
        nextProps.showAddress = patch.showAddress;
      }
      if (typeof patch.showWebsite === "boolean") {
        nextProps.showWebsite = patch.showWebsite;
      }
      if (typeof patch.showSocialLinks === "boolean") {
        nextProps.showSocialLinks = patch.showSocialLinks;
      }
      if (typeof patch.showContactForm === "boolean") {
        nextProps.showContactForm = patch.showContactForm;
      }
      const contactOn =
        nextProps.showEmail ||
        nextProps.showPhone ||
        nextProps.showAddress ||
        nextProps.showWebsite ||
        nextProps.showSocialLinks ||
        nextProps.showContactForm;
      modules[idx] = {
        ...cur,
        enabled: contactOn,
        props: nextProps,
      };
    }
  }
  if ("layout" in patch || "sortOrder" in patch) {
    const idx = modules.findIndex((m) => m.type === "collections");
    if (idx >= 0 && modules[idx]!.type === "collections") {
      const cur = modules[idx]!;
      if (cur.type !== "collections") return;
      modules[idx] = {
        ...cur,
        props: {
          layout: patch.layout !== undefined ? asLayout(patch.layout) : cur.props.layout,
          sortOrder:
            patch.sortOrder !== undefined
              ? asSortOrder(patch.sortOrder)
              : cur.props.sortOrder,
        },
      };
    }
  }

  hp.modules = modules;
}

/** Ensure modules exist and legacy toggles stay aligned. */
export function ensureHomepageModules(
  hp: StudioHomepageSettings,
): StudioHomepageSettings {
  hp.modules = normalizeHomepageModules(hp.modules, hp);
  syncHomepageTogglesFromModules(hp);
  return hp;
}

/** Enabled known modules in order — for AURA-224 renderer. */
export function enabledHomepageModules(
  modules: StudioHomepageModule[] | undefined,
): StudioHomepageModule[] {
  if (!Array.isArray(modules)) return [];
  return modules.filter(
    (m) => m && isHomepageModuleType(m.type) && m.enabled !== false,
  );
}
