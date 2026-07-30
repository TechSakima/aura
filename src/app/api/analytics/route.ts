import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import {
  bookingsHref,
  paymentsHref,
  projectWorkflowHref,
  sessionDeliveryHref,
} from "@/lib/admin-deep-links";
import { readStudioDb } from "@/lib/db/store";
import type { AnalyticsEvent, AuraDatabase } from "@/lib/types";

function sum(nums: number[]) {
  return nums.reduce((a, b) => a + b, 0);
}

function deliveryHref(
  projectId?: string | null,
  sessionId?: string | null,
): string | undefined {
  const p = projectId?.trim();
  const s = sessionId?.trim();
  if (p && s) return sessionDeliveryHref(p, s);
  if (p) return projectWorkflowHref(p);
  return undefined;
}

function eventHref(e: AnalyticsEvent, db: AuraDatabase): string | undefined {
  let projectId = e.projectId;
  let sessionId = e.sessionId || e.shootId;

  if (e.galleryId) {
    const g = db.galleries.find((x) => x.id === e.galleryId);
    if (g) {
      projectId = projectId || g.projectId;
      sessionId = sessionId || g.sessionId || g.shootId;
    }
  }

  switch (e.type) {
    case "booking_submitted":
      return bookingsHref();
    case "proposal_view":
    case "proposal_accept":
    case "contract_signed":
      return projectId ? projectWorkflowHref(projectId) : undefined;
    case "payment_received":
    case "payment_reversed":
      return projectId ? projectWorkflowHref(projectId) : paymentsHref();
    case "gallery_view":
    case "photo_view":
    case "download_single":
    case "download_bulk":
    case "favorite_toggle":
    case "subalbum_view":
      return deliveryHref(projectId, sessionId);
    default:
      return projectId ? projectWorkflowHref(projectId) : undefined;
  }
}

function photoDeliveryHref(
  db: AuraDatabase,
  photoId: string,
): string | undefined {
  const photo = db.photos.find((p) => p.id === photoId);
  if (!photo) return undefined;
  const gallery = db.galleries.find((g) => g.id === photo.galleryId);
  if (!gallery) return undefined;
  return deliveryHref(
    gallery.projectId,
    gallery.sessionId || gallery.shootId,
  );
}

export async function GET(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const sessionId =
    url.searchParams.get("sessionId") || url.searchParams.get("shootId") || undefined;
  const projectIdParam = url.searchParams.get("projectId") || undefined;
  const galleryId = url.searchParams.get("galleryId") || undefined;

  const db = await readStudioDb(admin.studioId);
  let events = db.analyticsEvents;

  let projectIdFilter: string | undefined = projectIdParam;
  if (sessionId) {
    const session = db.sessions.find((s) => s.id === sessionId);
    projectIdFilter = session?.projectId || projectIdFilter;
  }

  if (sessionId) {
    events = events.filter(
      (e) =>
        e.sessionId === sessionId ||
        e.shootId === sessionId ||
        (projectIdFilter != null && e.projectId === projectIdFilter),
    );
  } else if (projectIdFilter) {
    events = events.filter((e) => e.projectId === projectIdFilter);
  }
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
        href: photoDeliveryHref(db, photoId),
      };
    });

  const byDay: Record<string, number> = {};
  for (const e of events) {
    const day = e.at.slice(0, 10);
    byDay[day] = (byDay[day] || 0) + 1;
  }

  let txs = db.paymentTransactions;
  let invoices = db.invoices;
  if (projectIdFilter) {
    txs = txs.filter((t) => t.projectId === projectIdFilter);
    invoices = invoices.filter((i) => i.projectId === projectIdFilter);
  } else if (sessionId) {
    txs = [];
    invoices = [];
  }

  const revenueByDay: Record<string, number> = {};
  for (const t of txs) {
    const day = t.createdAt.slice(0, 10);
    revenueByDay[day] = (revenueByDay[day] || 0) + t.netAmount;
  }

  const openInvoices = invoices.filter(
    (i) => i.status === "upcoming" || i.status === "past_due" || i.status === "draft",
  );
  const paidInvoices = invoices.filter((i) => i.status === "paid");

  const projectName = (projectId?: string) =>
    projectId
      ? db.projects.find((p) => p.id === projectId)?.name
      : undefined;

  const financials = {
    collectedNet: sum(txs.map((t) => t.netAmount)),
    collectedGross: sum(txs.map((t) => t.grossAmount)),
    processingFees: sum(txs.map((t) => t.processingFee)),
    transactionCount: txs.length,
    openInvoiceNet: sum(openInvoices.map((i) => i.netAmount)),
    openInvoiceCount: openInvoices.length,
    paidInvoiceNet: sum(paidInvoices.map((i) => i.netAmount)),
    byDay: revenueByDay,
    recent: txs.slice(0, 12).map((t) => ({
      id: t.id,
      netAmount: t.netAmount,
      grossAmount: t.grossAmount,
      processingFee: t.processingFee,
      projectId: t.projectId,
      projectName: projectName(t.projectId),
      createdAt: t.createdAt,
      href: t.projectId
        ? projectWorkflowHref(t.projectId)
        : paymentsHref(),
    })),
  };

  return NextResponse.json({
    totals: counts,
    topPhotos,
    byDay,
    recent: events.slice(-50).reverse().map((e) => {
      let projectId = e.projectId;
      if (!projectId && e.galleryId) {
        projectId = db.galleries.find((g) => g.id === e.galleryId)?.projectId;
      }
      return {
        id: e.id,
        type: e.type,
        at: e.at,
        photoId: e.photoId,
        projectName: projectName(projectId),
        href: eventHref(e, db),
      };
    }),
    financials,
  });
}
