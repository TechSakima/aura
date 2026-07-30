import type { Metadata, Viewport } from "next";
import { cache } from "react";
import { findStudioByHomepageSlug } from "@/lib/db/homepage-slug";
import { resolveBrowseMediaUrl } from "@/lib/media-url-server";
import { absoluteUrl } from "@/lib/notify/send";
import { studioShareCardFromBrand } from "@/lib/share-card";
import {
  appleStatusBarForBackground,
  studioPwaBrand,
} from "@/lib/studio-pwa-manifest";

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

const publicStudioBySlug = cache(async (slug: string) => {
  try {
    return await findStudioByHomepageSlug(slug);
  } catch {
    return null;
  }
});

/** Open Graph / share + PWA manifest for public homepage & book (AURA-325 / 288). */
export async function publicStudioShareMetadata(
  slug: string,
  opts?: { pathPrefix?: "h" | "book" },
): Promise<Metadata> {
  const prefix = opts?.pathPrefix || "h";
  const studio = await publicStudioBySlug(slug);
  if (!studio?.homepage?.enabled) {
    return { title: "Aura" };
  }

  const card = studioShareCardFromBrand(studio);
  const image = await absolutizeImage(card.imageSrc);
  const title = card.title;
  const description = card.description;
  const brand = studioPwaBrand(studio);

  return {
    title,
    description,
    manifest: `/${prefix}/${slug}/manifest.webmanifest`,
    appleWebApp: {
      capable: true,
      title: brand.shortName,
      statusBarStyle: appleStatusBarForBackground(brand.themeColor),
    },
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
}

/** theme-color for homepage / book — kit canvas (AURA-288 / 295). */
export async function publicStudioViewport(slug: string): Promise<Viewport> {
  const studio = await publicStudioBySlug(slug);
  if (!studio?.homepage?.enabled) {
    return { themeColor: studioPwaBrand(null).themeColor };
  }
  return { themeColor: studioPwaBrand(studio).themeColor };
}
