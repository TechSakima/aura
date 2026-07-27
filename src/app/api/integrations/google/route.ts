import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { updateStudioDb } from "@/lib/db/store";
import { appOrigin } from "@/lib/notify/send";

/** Google Calendar connect stub — real OAuth when GOOGLE_CLIENT_ID is set. */
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({
      configured: false,
      message:
        "Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to enable OAuth. Sessions can still be managed in Aura; sync will push when connected.",
    });
  }
  const origin = appOrigin();
  const redirect = `${origin}/api/integrations/google/callback`;
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirect);
  url.searchParams.set("response_type", "code");
  url.searchParams.set(
    "scope",
    "https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly",
  );
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  return NextResponse.json({ configured: true, authUrl: url.toString() });
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  if (body.action === "disconnect") {
    await updateStudioDb(admin.studioId, (db) => {
      db.studio.googleCalendarConnected = false;
      db.studio.googleCalendarRefreshToken = undefined;
    });
    return NextResponse.json({ ok: true, connected: false });
  }
  if (body.action === "busy") {
    const { getBusyIntervals } = await import("@/lib/google-calendar");
    const timeMin = String(body.timeMin || new Date().toISOString());
    const timeMax = String(
      body.timeMax ||
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    );
    const busy = await getBusyIntervals({
      studioId: admin.studioId,
      timeMin,
      timeMax,
    });
    return NextResponse.json({ busy });
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (clientId) {
    const origin = appOrigin();
    const redirect = `${origin}/api/integrations/google/callback`;
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirect);
    url.searchParams.set("response_type", "code");
    url.searchParams.set(
      "scope",
      "https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly",
    );
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "consent");
    return NextResponse.json({ ok: true, authUrl: url.toString() });
  }

  // Dev/demo: mark connected without OAuth when secrets missing
  await updateStudioDb(admin.studioId, (db) => {
    db.studio.googleCalendarConnected = true;
  });
  return NextResponse.json({
    ok: true,
    connected: true,
    note: "Marked connected. Full OAuth sync activates when GOOGLE_CLIENT_ID/SECRET are set.",
  });
}
