import { primaryLogoFromKit } from "@/lib/brand-kit";
import type { Studio } from "@/lib/types";

export type StudioShareCard = {
  title: string;
  description?: string;
  /** Stored media path / URL before absolutizing for crawlers */
  imageSrc?: string;
};

/**
 * Title / description / OG image from brand kit (+ studio name) (AURA-235).
 * Cover → default cover → primary logo. Client-safe (no Node imports).
 */
export function studioShareCardFromBrand(
  studio: Pick<
    Studio,
    | "name"
    | "brandTagline"
    | "brandKit"
    | "defaultCoverImageUrl"
    | "logoUrl"
    | "homepage"
  > & {
    /** Admin preview when homepage object is incomplete */
    biography?: string;
  },
): StudioShareCard {
  const kit = studio.brandKit;
  const title = (studio.name || "Studio").trim() || "Studio";
  const description =
    studio.brandTagline?.trim() ||
    studio.biography?.trim() ||
    studio.homepage?.biography?.trim() ||
    undefined;
  const imageSrc =
    kit?.coverImageUrl ||
    studio.defaultCoverImageUrl ||
    (kit ? primaryLogoFromKit(kit.logos) : undefined) ||
    studio.logoUrl ||
    undefined;
  return { title, description, imageSrc };
}
