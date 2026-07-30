import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import {
  getStudioDoc,
  listGalleriesForStudio,
  listSessionTypesForStudio,
} from "@/lib/db/store";
import { ensureHomepageModules } from "@/lib/homepage-modules";
import { buildHomepagePayload } from "@/lib/homepage-payload";

/** Admin preview — same payload as public `/h`, even when draft (AURA-331). */
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const studio = await getStudioDoc(admin.studioId);
  if (!studio) {
    return NextResponse.json({ error: "Studio not found" }, { status: 404 });
  }
  const [galleries, sessionTypes] = await Promise.all([
    listGalleriesForStudio(admin.studioId),
    listSessionTypesForStudio(admin.studioId),
  ]);
  const payload = await buildHomepagePayload(studio, galleries, sessionTypes);
  const hp = studio.homepage;
  if (hp) ensureHomepageModules(hp);
  return NextResponse.json({
    ...payload,
    meta: {
      enabled: Boolean(hp?.enabled),
      slug: hp?.slug || "",
      hasPassword: Boolean(hp?.passwordHash),
      layout: hp?.layout || "masonry",
      /** Full module list for builder edit (AURA-225). */
      modules: hp?.modules || [],
      /** Studio slice for site checklist (AURA-236). */
      readinessStudio: {
        logoUrl: studio.logoUrl,
        brandKit: studio.brandKit,
        theme: studio.theme,
        ownerEmail: studio.ownerEmail,
        phone: studio.phone,
        website: studio.website,
        addressLine1: studio.addressLine1,
        socialLinks: studio.socialLinks,
      },
    },
  });
}
