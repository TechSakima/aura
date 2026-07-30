export const SETTINGS_SECTIONS = [
  { id: "overview", label: "Overview", href: "/admin/settings/overview" },
  { id: "account", label: "Account", href: "/admin/settings/account" },
  { id: "brand", label: "Brand", href: "/admin/settings/brand" },
  { id: "business", label: "Business", href: "/admin/settings/business" },
  { id: "studio", label: "Studio", href: "/admin/settings/studio" },
  { id: "website", label: "Website", href: "/admin/settings/website" },
  { id: "booking", label: "Booking", href: "/admin/settings/booking" },
  { id: "delivery", label: "Delivery", href: "/admin/settings/delivery" },
  { id: "payments", label: "Payments", href: "/admin/settings/payments" },
  {
    id: "notifications",
    label: "Notifications",
    href: "/admin/settings/notifications",
  },
  {
    id: "integrations",
    label: "Integrations",
    href: "/admin/settings/integrations",
  },
  { id: "library", label: "Library", href: "/admin/settings/library" },
  { id: "team", label: "Team", href: "/admin/settings/team" },
  { id: "data", label: "Data", href: "/admin/settings/data" },
] as const;

export type SettingsSectionId = (typeof SETTINGS_SECTIONS)[number]["id"];

export const SETTINGS_LAST_SECTION_KEY = "aura-settings-section";

export function isSettingsSectionId(value: string): value is SettingsSectionId {
  return SETTINGS_SECTIONS.some((s) => s.id === value);
}

export function settingsSectionFromPathname(
  pathname: string,
): SettingsSectionId | null {
  const match = pathname.match(/^\/admin\/settings\/([^/]+)/);
  const id = match?.[1];
  if (!id || !isSettingsSectionId(id)) return null;
  return id;
}
