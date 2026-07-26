import { NextResponse } from "next/server";

export async function GET() {
  const manifest = {
    name: "Aura — Studio Photography",
    short_name: "Aura",
    description:
      "Quotes, galleries, and delivery for a solo photography studio.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f5f2",
    theme_color: "#1a1a1a",
    icons: [
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
    ],
  };

  return NextResponse.json(manifest, {
    headers: {
      "Content-Type": "application/manifest+json",
    },
  });
}
