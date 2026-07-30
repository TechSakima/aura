import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { readStudioDb } from "@/lib/db/store";

function sum(nums: number[]) {
  return nums.reduce((a, b) => a + b, 0);
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
    // Session filter with no project — empty money slice
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
      projectName: projectName(t.projectId),
      createdAt: t.createdAt,
    })),
  };

  return NextResponse.json({
    totals: counts,
    topPhotos,
    byDay,
    recent: events.slice(-50).reverse(),
    financials,
  });
}
