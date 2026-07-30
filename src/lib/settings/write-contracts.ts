/**
 * Settings write contracts (AURA-349).
 *
 * Each Settings section PATCHes `/api/studio` with `section` + only its keys.
 * Server whitelists and persists via studio-doc merge (no full workspace RMW).
 *
 * | Section        | Body keys |
 * |----------------|-----------|
 * | account        | ownerFirstName, ownerLastName |
 * | brand          | name, brandTagline, socialLinks, brandKit, theme, logos (legacy) |
 * | business       | website, phone, address*, country, printPartners |
 * | studio         | timeZone, dateFormat |
 * | website        | homepage (site fields + modules; not showBooking) |
 * | booking        | bookingDefaults, homepage.showBooking |
 * | delivery       | defaultWatermarkPresetId, deliveryDefaults |
 * | payments       | paymentDefaults |
 * | notifications  | notificationPrefs |
 * | contact        | contactPrefs, homepage.showContactForm |
 * | library        | legalDefaults |
 * | data           | homepage.enabled (danger: turn off site) |
 *
 * Non-studio APIs: watermarks, Connect, Google, galleries showOnHomepage, auth.
 */

export const SETTINGS_WRITE_SECTIONS = [
  "account",
  "brand",
  "business",
  "studio",
  "website",
  "booking",
  "delivery",
  "payments",
  "notifications",
  "contact",
  "library",
  "data",
] as const;

export type SettingsWriteSection = (typeof SETTINGS_WRITE_SECTIONS)[number];

export function isSettingsWriteSection(
  value: unknown,
): value is SettingsWriteSection {
  return (
    typeof value === "string" &&
    (SETTINGS_WRITE_SECTIONS as readonly string[]).includes(value)
  );
}

/** Top-level body keys allowed per section (besides `section`). */
export const SECTION_TOP_LEVEL_KEYS: Record<
  SettingsWriteSection,
  readonly string[]
> = {
  account: ["ownerFirstName", "ownerLastName"],
  brand: [
    "name",
    "brandTagline",
    "socialLinks",
    "brandKit",
    "theme",
    "defaultCoverImageUrl",
    "logoUrl",
    "coverLogoUrl",
  ],
  business: [
    "website",
    "phone",
    "addressLine1",
    "addressLine2",
    "city",
    "region",
    "postalCode",
    "country",
    "printPartners",
  ],
  studio: ["timeZone", "dateFormat"],
  website: ["homepage"],
  booking: ["bookingDefaults", "homepage"],
  delivery: ["defaultWatermarkPresetId", "deliveryDefaults"],
  payments: ["paymentDefaults"],
  notifications: ["notificationPrefs"],
  contact: ["contactPrefs", "homepage"],
  library: ["legalDefaults"],
  data: ["homepage"],
};

/** Homepage nested keys allowed when section patches `homepage`. */
export const SECTION_HOMEPAGE_KEYS: Partial<
  Record<SettingsWriteSection, readonly string[]>
> = {
  website: [
    "enabled",
    "slug",
    "biography",
    "showBiography",
    "showSocialLinks",
    "showWebsite",
    "showEmail",
    "showPhone",
    "showAddress",
    "showContactForm",
    "sortOrder",
    "layout",
    "modules",
    "password",
    "clearPassword",
  ],
  booking: ["showBooking"],
  contact: ["showContactForm"],
  data: ["enabled"],
};

export const NOTIFICATION_PREF_KEYS = [
  "emailQuoteAccepted",
  "emailPaymentReceived",
  "emailBookingSubmitted",
  "emailContactMessage",
  "emailClientQuote",
  "emailClientGallery",
  "emailClientPayment",
  "emailClientBooking",
] as const;
