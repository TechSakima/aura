import { NextResponse } from "next/server";
import { findStudioByHomepageSlug } from "@/lib/db/homepage-slug";
import {
  buildWebManifest,
  studioPwaBrand,
  studioPwaIconMediaUrl,
  webManifestResponse,
} from "@/lib/studio-pwa-manifest";

/** Public homepage PWA — scoped to /h/{slug} when published (AURA-288 / 289). */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { slug } = await ctx.params;
  const studio = await findStudioByHomepageSlug(slug);
  if (!studio?.homepage?.enabled) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const brand = studioPwaBrand(studio);
  const path = `/h/${slug}`;
  const { body, headers } = webManifestResponse(
    buildWebManifest({
      id: path,
      name: brand.name,
      shortName: brand.shortName,
      description: `${brand.name} — studio site`,
      startUrl: path,
      scope: path,
      backgroundColor: brand.backgroundColor,
      themeColor: brand.themeColor,
      iconQuery: studioPwaIconMediaUrl(studio)
        ? `slug=${encodeURIComponent(slug)}`
        : null,
      preferExistingWindow: true,
    }),
  );

  return NextResponse.json(body, { headers });
}
