import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { readStudioDb } from "@/lib/db/store";
import { resolveBrowseMediaUrl } from "@/lib/media-url-server";
import { resolveStudioThemePreset } from "@/lib/themes";

export async function GET() {
  let name = "Aura — Studio Photography";
  let shortName = "Aura";
  let backgroundColor = "#f7f5f2";
  let themeColor = "#1a1a1a";
  let iconSrc: string | undefined;

  const admin = await requireAdmin();
  if (admin) {
    const db = await readStudioDb(admin.studioId);
    const studio = db.studio;
    if (studio.name) {
      name = `${studio.name} — Studio`;
      shortName = studio.name.slice(0, 12);
    }
    const preset = resolveStudioThemePreset(studio.theme);
    backgroundColor = preset.background;
    themeColor = preset.accent;
    if (studio.logoUrl) {
      iconSrc = await resolveBrowseMediaUrl(studio.logoUrl);
    }
  }

  const icons = iconSrc
    ? [
        {
          src: iconSrc,
          sizes: "192x192",
          type: "image/png",
          purpose: "any",
        },
        {
          src: iconSrc,
          sizes: "512x512",
          type: "image/png",
          purpose: "any",
        },
        {
          src: iconSrc,
          sizes: "512x512",
          type: "image/png",
          purpose: "maskable",
        },
      ]
    : [
        {
          src: "/icon-192.png",
          sizes: "192x192",
          type: "image/png",
          purpose: "any",
        },
        {
          src: "/icon-512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "any",
        },
        {
          src: "/icon-512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "maskable",
        },
      ];

  const manifest = {
    name,
    short_name: shortName,
    description: `${shortName} — quotes, galleries, and delivery.`,
    start_url: admin ? "/admin" : "/",
    scope: admin ? "/admin" : "/",
    display: "standalone",
    background_color: backgroundColor,
    theme_color: themeColor,
    icons,
  };

  return NextResponse.json(manifest, {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "private, max-age=0, must-revalidate",
    },
  });
}
