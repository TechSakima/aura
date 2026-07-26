import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { readDb } from "@/lib/db/store";

export async function GET(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const shootId = url.searchParams.get("shootId") || undefined;
  const galleryId = url.searchParams.get("galleryId") || undefined;

  const db = await readDb();
  let events = db.analyticsEvents;
  if (shootId) events = events.filter((e) => e.shootId === shootId);
  if (galleryId) events = events.filter((e) => e.galleryId === galleryId);

  const counts: Record<string, number> = {};
  const photoViews: Record<string, number> = {};
  for (const e of events) {
    counts[e.type] = (counts[e.type] || 0) + 1;
    if (e.photoId && (e.type === "photo_view" || e.type === "download_single")) {
      photoViews[e.photoId] = (photoViews[e.photoId] || 0) + 1;
    }
  }

  const topPhotos = Object.entries(photoViews)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([photoId, count]) => {
      const photo = db.photos.find((p) => p.id === photoId);
      return {
        photoId,
        count,
        thumbUrl: photo?.thumbUrl,
      };
    });

  const byDay: Record<string, number> = {};
  for (const e of events) {
    const day = e.at.slice(0, 10);
    byDay[day] = (byDay[day] || 0) + 1;
  }

  return NextResponse.json({
    totals: counts,
    topPhotos,
    byDay,
    recent: events.slice(-50).reverse(),
  });
}
