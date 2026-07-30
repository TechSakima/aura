import type { BrandSocialTreatment } from "@/lib/types";

export type SocialNetworkId =
  | "instagram"
  | "facebook"
  | "x"
  | "tiktok"
  | "youtube"
  | "pinterest"
  | "linkedin"
  | "vimeo"
  | "link";

/** Infer network from label or URL for icon treatment (AURA-233). */
export function resolveSocialNetwork(
  label: string,
  url: string,
): SocialNetworkId {
  const hay = `${label} ${url}`.toLowerCase();
  if (hay.includes("instagram") || hay.includes("instagr.am")) {
    return "instagram";
  }
  if (hay.includes("facebook") || hay.includes("fb.com") || hay.includes("fb.me")) {
    return "facebook";
  }
  if (
    hay.includes("tiktok") ||
    hay.includes("tiktok.com")
  ) {
    return "tiktok";
  }
  if (
    hay.includes("youtube") ||
    hay.includes("youtu.be")
  ) {
    return "youtube";
  }
  if (hay.includes("pinterest")) return "pinterest";
  if (hay.includes("linkedin")) return "linkedin";
  if (hay.includes("vimeo")) return "vimeo";
  if (
    hay.includes("twitter") ||
    hay.includes("x.com") ||
    /(?:^|\/\/)x\.com\b/.test(hay)
  ) {
    return "x";
  }
  return "link";
}

export function resolveSocialTreatment(
  value?: string | null,
): BrandSocialTreatment {
  return value === "icons" || value === "pills" || value === "text"
    ? value
    : "text";
}

/** `tel:` href — keep leading +, strip other non-digits. */
export function telHref(phone: string): string {
  const trimmed = phone.trim();
  if (!trimmed) return "tel:";
  if (trimmed.toLowerCase().startsWith("tel:")) return trimmed;
  const cleaned = trimmed.replace(/[^\d+]/g, "");
  return `tel:${cleaned || trimmed}`;
}

export function mailtoHref(email: string): string {
  const trimmed = email.trim();
  if (!trimmed) return "mailto:";
  if (trimmed.toLowerCase().startsWith("mailto:")) return trimmed;
  return `mailto:${trimmed}`;
}

export function mapsHref(query: string): string | undefined {
  const q = query.trim();
  if (!q) return undefined;
  return `https://maps.google.com/?q=${encodeURIComponent(q)}`;
}
