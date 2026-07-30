import { NextResponse } from "next/server";
import { findStudioByHomepageSlug } from "@/lib/db/homepage-slug";
import {
  buildWebManifest,
  studioPwaBrand,
  studioPwaIconMediaUrl,
  webManifestResponse,
} from "@/lib/studio-pwa-manifest";

/** Public book PWA — scoped to /book/{slug} when studio site is live (AURA-288 / 289). */
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
  const path = `/book/${slug}`;
  const { body, headers } = webManifestResponse(
    buildWebManifest({
      id: path,
      name: `Book — ${brand.name}`,
      shortName: brand.shortName,
      description: `Book a session with ${brand.name}`,
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
