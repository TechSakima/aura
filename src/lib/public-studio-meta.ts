import type { Metadata } from "next";
import { findStudioByHomepageSlug } from "@/lib/db/homepage-slug";
import { resolveBrowseMediaUrl } from "@/lib/media-url-server";
import { absoluteUrl } from "@/lib/notify/send";
import { studioShareCardFromBrand } from "@/lib/share-card";

async function absolutizeImage(
  imageSrc?: string,
): Promise<string | undefined> {
  if (!imageSrc) return undefined;
  const cover = await resolveBrowseMediaUrl(imageSrc, {
    expiresInSec: 60 * 60 * 24 * 7,
  });
  if (!cover) return undefined;
  if (cover.startsWith("http")) return cover;
  return absoluteUrl(cover);
}

/** Open Graph / share metadata for public homepage & book routes (AURA-325 / 235). */
export async function publicStudioShareMetadata(
  slug: string,
  opts?: { pathPrefix?: "h" | "book" },
): Promise<Metadata> {
  const prefix = opts?.pathPrefix || "h";
  try {
    const studio = await findStudioByHomepageSlug(slug);
    if (!studio?.homepage?.enabled) {
      return { title: "Aura" };
    }

    const card = studioShareCardFromBrand(studio);
    const image = await absolutizeImage(card.imageSrc);
    const title = card.title;
    const description = card.description;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url: absoluteUrl(`/${prefix}/${slug}`),
        type: "website",
        siteName: title,
        ...(image ? { images: [{ url: image, alt: title }] } : {}),
      },
      twitter: {
        card: image ? "summary_large_image" : "summary",
        title,
        description,
        ...(image ? { images: [image] } : {}),
      },
    };
  } catch {
    return { title: "Aura" };
  }
}
