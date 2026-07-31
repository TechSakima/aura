import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getGalleryById } from "@/lib/db/store";
import {
  drainWatermarkJobs,
  enqueueWatermarkReprocess,
} from "@/lib/jobs/watermark-reprocess";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;

  const gallery = await getGalleryById(id);
  if (!gallery || gallery.studioId !== admin.studioId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { job, alreadyQueued } = await enqueueWatermarkReprocess({
    studioId: admin.studioId,
    galleryId: id,
  });

  /* Kick one slice now (photo patches only); remainder via cron. */
  const progress = await drainWatermarkJobs({ limit: 1 }).catch(() => null);

  return NextResponse.json({
    queued: true,
    alreadyQueued,
    jobId: job.id,
    progress,
  });
}
