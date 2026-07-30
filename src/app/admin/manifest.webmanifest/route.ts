import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import {
  buildWebManifest,
  studioPwaBrand,
  studioPwaIconMediaUrl,
  webManifestResponse,
} from "@/lib/studio-pwa-manifest";

/** Studio admin PWA — scoped to /admin (AURA-288 / 289). */
export async function GET() {
  const admin = await requireAdmin();
  const brand = studioPwaBrand(admin?.studio);
  const hasMark = Boolean(studioPwaIconMediaUrl(admin?.studio));

  const { body, headers } = webManifestResponse(
    buildWebManifest({
      id: "/admin",
      name: `${brand.name} — Studio`,
      shortName: brand.shortName,
      description: `${brand.shortName} — quotes, galleries, and delivery.`,
      startUrl: "/admin",
      scope: "/admin",
      backgroundColor: brand.backgroundColor,
      themeColor: brand.themeColor,
      iconQuery: hasMark ? "surface=admin" : null,
      preferExistingWindow: true,
    }),
  );

  return NextResponse.json(body, { headers });
}
