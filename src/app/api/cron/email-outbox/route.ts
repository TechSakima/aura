import { NextResponse } from "next/server";
import { drainEmailOutbox } from "@/lib/email-outbox";

/**
 * Drain durable email outbox (AURA-313 contact; AURA-149 generalizes).
 * Auth: Authorization: Bearer $CRON_SECRET
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

  const result = await drainEmailOutbox({ limit: 20 });
  return NextResponse.json({ ok: true, ...result });
}
