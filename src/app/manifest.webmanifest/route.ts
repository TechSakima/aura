import { NextResponse } from "next/server";
import {
  buildWebManifest,
  studioPwaBrand,
  webManifestResponse,
} from "@/lib/studio-pwa-manifest";

/** Generic Aura fallback — not studio-scoped (AURA-288). Admin → /admin/manifest.webmanifest. */
export async function GET() {
  const brand = studioPwaBrand(null);
  const { body, headers } = webManifestResponse(
    buildWebManifest({
      id: "/",
      name: "Aura — Studio Photography",
      shortName: brand.shortName,
      description: "Quotes, galleries, and delivery for a solo photography studio.",
      startUrl: "/",
      scope: "/",
      backgroundColor: brand.backgroundColor,
      themeColor: brand.themeColor,
    }),
  );

  return NextResponse.json(body, { headers });
}
