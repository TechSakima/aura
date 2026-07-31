import type { Metadata, Viewport } from "next";
import { cache } from "react";
import { findGalleryByPublicToken, getStudioDoc } from "@/lib/db/store";
import {
  publicStudioTheme,
  resolveGalleryBrandColors,
} from "@/lib/gallery-brand";
import { normalizeGalleryDesign } from "@/lib/gallery-design";
import { galleryPwaShortName } from "@/lib/gallery-pwa-manifest";
import { appleStatusBarForBackground } from "@/lib/studio-pwa-manifest";

type Props = { children: React.ReactNode; params: Promise<{ token: string }> };

const DEFAULT_BG = "#f3efe6";

const galleryPwaChrome = cache(async (token: string) => {
  const gallery = await findGalleryByPublicToken(token);
  if (!gallery) {
    return { found: false as const, themeColor: DEFAULT_BG };
  }

  const title = gallery.title?.trim() || "Gallery";
  const design = normalizeGalleryDesign(gallery.design);
  const studio = gallery.studioId
    ? await getStudioDoc(gallery.studioId)
    : null;
  const colors = resolveGalleryBrandColors(
    design,
    studio ? publicStudioTheme(studio) : null,
  );
  return {
    found: true as const,
    title,
    themeColor: colors.themeColor,
    short: galleryPwaShortName(title),
  };
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const chrome = await galleryPwaChrome(token);
  if (!chrome.found) {
    // No manifest link — unknown tokens must not look installable (AURA-402).
    return { title: "Gallery" };
  }
  return {
    title: chrome.title,
    manifest: `/g/${token}/manifest.webmanifest`,
    appleWebApp: {
      capable: true,
      title: chrome.short,
      statusBarStyle: appleStatusBarForBackground(chrome.themeColor),
    },
  };
}

export async function generateViewport({
  params,
}: Props): Promise<Viewport> {
  const { token } = await params;
  const { themeColor } = await galleryPwaChrome(token);
  return { themeColor };
}

export default function GalleryLayout({ children }: Props) {
  return children;
}
