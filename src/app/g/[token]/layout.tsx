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
  let title = "Aura Gallery";
  let themeColor = DEFAULT_BG;
  if (gallery) {
    title = gallery.title?.trim() || title;
    const design = normalizeGalleryDesign(gallery.design);
    const studio = gallery.studioId
      ? await getStudioDoc(gallery.studioId)
      : null;
    const colors = resolveGalleryBrandColors(
      design,
      studio ? publicStudioTheme(studio) : null,
    );
    themeColor = colors.themeColor;
  }
  return {
    title,
    themeColor,
    short: galleryPwaShortName(title),
  };
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const { title, short, themeColor } = await galleryPwaChrome(token);
  return {
    title,
    manifest: `/g/${token}/manifest.webmanifest`,
    appleWebApp: {
      capable: true,
      title: short,
      statusBarStyle: appleStatusBarForBackground(themeColor),
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
