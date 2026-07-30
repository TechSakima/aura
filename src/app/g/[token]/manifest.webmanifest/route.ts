import { NextResponse } from "next/server";
import { findGalleryByPublicToken, getStudioDoc } from "@/lib/db/store";
import {
  publicStudioTheme,
  resolveGalleryBrandColors,
} from "@/lib/gallery-brand";
import { normalizeGalleryDesign } from "@/lib/gallery-design";
import {
  galleryPwaIcons,
  galleryPwaShortName,
} from "@/lib/gallery-pwa-manifest";
import { resolveBrowseMediaUrl } from "@/lib/media-url-server";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  const gallery = await findGalleryByPublicToken(token);

  let title = "Aura Gallery";
  let backgroundColor = "#f7f5f2";
  let themeColor = "#1a1a1a";
  let iconSrc: string | undefined;

  if (gallery?.studioId) {
    title = gallery.title?.trim() || title;
    const design = normalizeGalleryDesign(gallery.design);
    const studio = await getStudioDoc(gallery.studioId);
    const studioTheme = studio ? publicStudioTheme(studio) : null;
    const colors = resolveGalleryBrandColors(design, studioTheme);
    backgroundColor = colors.backgroundColor;
    themeColor = colors.themeColor;

    const rawIcon =
      design.appIconUrl || studio?.logoUrl || gallery.coverPhotoUrl;
    if (rawIcon) {
      iconSrc = (await resolveBrowseMediaUrl(rawIcon)) || undefined;
    }
  }

  const shortName = galleryPwaShortName(title);
  const manifest = {
    id: `/g/${token}`,
    name: title,
    short_name: shortName,
    description: `Photo gallery — ${title}`,
    start_url: `/g/${token}`,
    scope: `/g/${token}`,
    display: "standalone",
    background_color: backgroundColor,
    theme_color: themeColor,
    icons: galleryPwaIcons(iconSrc),
  };

  return NextResponse.json(manifest, {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "private, max-age=0, must-revalidate",
    },
  });
}
