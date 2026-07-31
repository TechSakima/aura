import { NextResponse } from "next/server";
import { findGalleryByPublicToken, getStudioDoc } from "@/lib/db/store";
import {
  publicStudioTheme,
  resolveGalleryBrandColors,
} from "@/lib/gallery-brand";
import { normalizeGalleryDesign } from "@/lib/gallery-design";
import { galleryPwaShortName } from "@/lib/gallery-pwa-manifest";
import {
  buildWebManifest,
  studioPwaIconMediaUrl,
  webManifestResponse,
} from "@/lib/studio-pwa-manifest";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  const gallery = await findGalleryByPublicToken(token);
  // Unknown token must not emit an installable “Aura Gallery” shell (AURA-402).
  if (!gallery) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let title = gallery.title?.trim() || "Gallery";
  let backgroundColor = "#f3efe6";
  let themeColor = "#f3efe6";
  let hasIconSource = Boolean(gallery.coverPhotoUrl);

  if (gallery.studioId) {
    const design = normalizeGalleryDesign(gallery.design);
    const studio = await getStudioDoc(gallery.studioId);
    const studioTheme = studio ? publicStudioTheme(studio) : null;
    const colors = resolveGalleryBrandColors(design, studioTheme);
    backgroundColor = colors.backgroundColor;
    themeColor = colors.themeColor;
    hasIconSource = Boolean(
      design.appIconUrl ||
        (studio ? studioPwaIconMediaUrl(studio) : undefined) ||
        gallery.coverPhotoUrl,
    );
  }

  const shortName = galleryPwaShortName(title);
  const path = `/g/${token}`;
  const { body, headers } = webManifestResponse(
    buildWebManifest({
      id: path,
      name: title,
      shortName,
      description: `Photo gallery — ${title}`,
      startUrl: path,
      scope: path,
      backgroundColor,
      themeColor,
      iconQuery: hasIconSource
        ? `token=${encodeURIComponent(token)}`
        : null,
      preferExistingWindow: true,
    }),
  );

  return NextResponse.json(body, { headers });
}
