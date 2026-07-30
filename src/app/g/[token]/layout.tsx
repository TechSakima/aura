import type { Metadata, Viewport } from "next";
import { cache } from "react";
import { findGalleryByPublicToken, getStudioDoc } from "@/lib/db/store";
import {
  publicStudioTheme,
  resolveGalleryBrandColors,
} from "@/lib/gallery-brand";
import { normalizeGalleryDesign } from "@/lib/gallery-design";
import { galleryPwaShortName } from "@/lib/gallery-pwa-manifest";

type Props = { children: React.ReactNode; params: Promise<{ token: string }> };

function isDarkBackground(hex: string): boolean {
  const h = hex.replace("#", "").trim();
  if (h.length < 6) return false;
  const r = Number.parseInt(h.slice(0, 2), 16);
  const g = Number.parseInt(h.slice(2, 4), 16);
  const b = Number.parseInt(h.slice(4, 6), 16);
  if ([r, g, b].some((n) => Number.isNaN(n))) return false;
  return (r * 299 + g * 587 + b * 114) / 1000 < 140;
}

const galleryPwaChrome = cache(async (token: string) => {
  const gallery = await findGalleryByPublicToken(token);
  let title = "Aura Gallery";
  let themeColor = "#1a1a1a";
  let backgroundColor = "#f7f5f2";
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
    backgroundColor = colors.backgroundColor;
  }
  return {
    title,
    themeColor,
    dark: isDarkBackground(backgroundColor),
    short: galleryPwaShortName(title),
  };
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const { title, short, dark } = await galleryPwaChrome(token);
  return {
    title,
    manifest: `/g/${token}/manifest.webmanifest`,
    appleWebApp: {
      capable: true,
      title: short,
      statusBarStyle: dark ? "black-translucent" : "default",
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
