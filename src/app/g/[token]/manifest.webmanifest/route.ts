import { NextResponse } from "next/server";
import { findGalleryByPublicToken } from "@/lib/db/store";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  const gallery = await findGalleryByPublicToken(token);

  const title = gallery?.title || "Aura Gallery";
  const cover = gallery?.coverPhotoUrl || "/icon-512.png";

  const manifest = {
    name: title,
    short_name: title.slice(0, 12),
    description: `Photo gallery — ${title}`,
    start_url: `/g/${token}`,
    scope: `/g/${token}`,
    display: "standalone",
    background_color: "#f7f5f2",
    theme_color: "#1a1a1a",
    icons: [
      {
        src: cover,
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };

  return NextResponse.json(manifest, {
    headers: {
      "Content-Type": "application/manifest+json",
    },
  });
}
