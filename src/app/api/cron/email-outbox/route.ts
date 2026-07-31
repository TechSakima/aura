import { NextResponse } from "next/server";
import { runMaintenanceJobs } from "@/lib/jobs/maintenance";

/**
 * Scheduled maintenance (AURA-112 / AURA-313 / AURA-110 / AURA-117 / AURA-387).
 * - Drain email outbox
 * - Purge expired auth sessions
 * - Expire past-due live galleries (patch, not RMW)
 * - Compact analyticsEvents (age retention + per-studio soft cap)
 * - Drain watermark reprocess jobs (photo patches only)
 *
 * Auth: Authorization: Bearer $CRON_SECRET
 * URL kept as `/api/cron/email-outbox` for existing schedulers.
 */
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 503 },
    );
  }

  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (token !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runMaintenanceJobs();
  return NextResponse.json({ ok: true, ...result });
}
