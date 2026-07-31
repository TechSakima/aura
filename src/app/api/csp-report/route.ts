import { NextResponse } from "next/server";
import { clientIp, rateLimit } from "@/lib/rate-limit";

/**
 * CSP violation sink (AURA-390). Report-Only / enforce both POST here.
 * Logs a short line for App Hosting; does not persist.
 */
export async function POST(req: Request) {
  const limited = rateLimit(`csp-report:${clientIp(req)}`, 60, 60_000);
  if (!limited.ok) {
    return new NextResponse(null, {
      status: 429,
      headers: { "Retry-After": String(limited.retryAfterSec) },
    });
  }

  try {
    const body = (await req.json()) as {
      "csp-report"?: { "violated-directive"?: string; "blocked-uri"?: string };
      "violated-directive"?: string;
      "blocked-uri"?: string;
    };
    const report = body["csp-report"] || body;
    const directive = report["violated-directive"] || "?";
    const blocked = report["blocked-uri"] || "?";
    console.warn(`[csp] ${directive} blocked ${blocked}`);
  } catch {
    /* ignore malformed */
  }

  return new NextResponse(null, { status: 204 });
}
