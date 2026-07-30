import { primaryLogoFromKit } from "@/lib/brand-kit";
import { enabledHomepageModules } from "@/lib/homepage-modules";
import type { Studio, StudioHomepageModule } from "@/lib/types";

export type WebsiteReadinessItem = {
  id: string;
  label: string;
  detail: string;
  href: string;
  done: boolean;
};

type Input = {
  studio: Pick<
    Studio,
    "logoUrl" | "brandKit" | "theme" | "ownerEmail" | "phone" | "socialLinks"
  > & {
    homepage?: Studio["homepage"];
    website?: string;
    addressLine1?: string;
  };
  modules?: StudioHomepageModule[] | null;
  /** Active session types exist (for booking readiness) */
  bookingReady?: boolean;
};

/**
 * Sparse website go-live checks (AURA-236) — logo, modules, booking|contact, theme.
 */
export function websiteReadinessItems(input: Input): WebsiteReadinessItem[] {
  const { studio, bookingReady = false } = input;
  const kit = studio.brandKit;
  const modules = input.modules?.length
    ? input.modules
    : studio.homepage?.modules || [];
  const enabled = enabledHomepageModules(modules);

  const logoDone = Boolean(
    (kit ? primaryLogoFromKit(kit.logos) : undefined) || studio.logoUrl,
  );

  const modulesDone = enabled.length > 0;

  const contactMod = enabled.find((m) => m.type === "contact");
  const contactOn = Boolean(contactMod);
  const contactHasInfo = Boolean(
    studio.ownerEmail ||
      studio.phone ||
      studio.website ||
      studio.addressLine1 ||
      (studio.socialLinks && studio.socialLinks.length > 0),
  );
  const bookingMod = enabled.some((m) => m.type === "bookingCta");
  const bookingOk = bookingMod && bookingReady;
  const contactOk = contactOn && contactHasInfo;
  const reachDone = bookingOk || contactOk;

  const themeDone = Boolean(
    kit?.basePresetId ||
      studio.theme?.presetId ||
      (kit?.background && kit?.accent) ||
      (studio.theme?.background && studio.theme?.accent),
  );

  return [
    {
      id: "logo",
      label: "Logo",
      detail: logoDone ? "Brand mark set" : "Upload a logo",
      href: "/admin/settings/brand",
      done: logoDone,
    },
    {
      id: "modules",
      label: "Modules",
      detail: modulesDone
        ? `${enabled.length} on`
        : "Turn on at least one module",
      href: "/admin/website",
      done: modulesDone,
    },
    {
      id: "reach",
      label: "Booking or contact",
      detail: bookingOk
        ? "Booking ready"
        : contactOk
          ? "Contact on"
          : "Enable booking or contact",
      href: bookingMod && !bookingReady
        ? "/admin/settings/booking"
        : "/admin/website",
      done: reachDone,
    },
    {
      id: "theme",
      label: "Theme",
      detail: themeDone ? "Brand kit applied" : "Choose a starting kit",
      href: "/admin/settings/brand",
      done: themeDone,
    },
  ];
}

export function websiteReadinessDoneCount(items: WebsiteReadinessItem[]): {
  done: number;
  total: number;
  complete: boolean;
} {
  const done = items.filter((i) => i.done).length;
  return { done, total: items.length, complete: done === items.length };
}
