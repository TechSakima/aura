import { NextResponse } from "next/server";
import { COL } from "@/lib/db/collections";
import { assertFirebaseReady } from "@/lib/db/require-firebase";
import { getStudioDoc, readStudioDb } from "@/lib/db/store";
import { resolveMediaUrl } from "@/lib/media-url";
import type { Studio } from "@/lib/types";
import { absoluteExternalUrl } from "@/lib/urls";

async function findStudioBySlug(slug: string): Promise<Studio | null> {
  const { db } = assertFirebaseReady();
  await getStudioDoc("noop").catch(() => null);
  const snap = await db.collection(COL.studios).get();
  for (const doc of snap.docs) {
    const s = { id: doc.id, ...doc.data() } as Studio;
    if (s.homepage?.slug === slug) return s;
  }
  return null;
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { slug } = await ctx.params;
  const studio = await findStudioBySlug(slug);
  if (!studio?.homepage?.enabled) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const url = new URL(req.url);
  const password = url.searchParams.get("password") || "";
  if (studio.homepage.passwordHash) {
    const bcrypt = await import("bcryptjs");
    const ok = await bcrypt.compare(password, studio.homepage.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: "Password required", needsPassword: true }, { status: 401 });
    }
  }

  const db = await readStudioDb(studio.id);
  let galleries = db.galleries.filter(
    (g) => g.showOnHomepage && g.status === "live",
  );
  if (studio.homepage.sortOrder === "created_asc") {
    galleries = galleries.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  } else if (studio.homepage.sortOrder === "title_asc") {
    galleries = galleries.sort((a, b) => a.title.localeCompare(b.title));
  } else {
    galleries = galleries.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  const hp = studio.homepage;
  return NextResponse.json({
    studio: {
      name: studio.name,
      logoUrl: resolveMediaUrl(studio.logoUrl),
      biography: hp.showBiography ? hp.biography || studio.brandTagline : undefined,
      website: hp.showWebsite
        ? absoluteExternalUrl(studio.website) || studio.website
        : undefined,
      email: hp.showEmail ? studio.ownerEmail : undefined,
      phone: hp.showPhone ? studio.phone : undefined,
      address: hp.showAddress
        ? [studio.addressLine1, studio.city, studio.region, studio.country]
            .filter(Boolean)
            .join(", ")
        : undefined,
      socialLinks: hp.showSocialLinks
        ? (studio.socialLinks || []).map((s) => ({
            label: s.label,
            url: absoluteExternalUrl(s.url) || s.url,
          }))
        : [],
      theme: studio.theme,
      showBooking: hp.showBooking !== false,
      layout: hp.layout || "masonry",
      bookingHref:
        hp.showBooking !== false && hp.slug ? `/book/${hp.slug}` : undefined,
    },
    galleries: galleries.map((g) => ({
      title: g.title,
      token: g.publicToken,
      coverPhotoUrl: resolveMediaUrl(g.coverPhotoUrl),
    })),
  });
}
