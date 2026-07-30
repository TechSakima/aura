import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { readStudioDb, updateStudioDb } from "@/lib/db/store";
import { appOrigin } from "@/lib/notify/send";

/** OAuth callback — stores this studio's Google Calendar refresh token. */
export async function GET(req: Request) {
  const admin = await requireAdmin();
  const origin = appOrigin();
  const settingsUrl = `${origin}/admin/settings/integrations`;

  if (!admin) {
    return NextResponse.redirect(`${origin}/admin/login`);
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const err = url.searchParams.get("error");
  if (err || !code) {
    return NextResponse.redirect(`${settingsUrl}?gcal=error`);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${settingsUrl}?gcal=error`);
  }

  const redirectUri = `${origin}/api/integrations/google/callback`;
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(`${settingsUrl}?gcal=error`);
  }

  const tokens = (await tokenRes.json()) as {
    refresh_token?: string;
    access_token?: string;
  };

  const existing = await readStudioDb(admin.studioId);
  const refreshToken =
    tokens.refresh_token || existing.studio.googleCalendarRefreshToken;
  if (!refreshToken) {
    return NextResponse.redirect(`${settingsUrl}?gcal=error`);
  }

  await updateStudioDb(admin.studioId, (db) => {
    db.studio.googleCalendarConnected = true;
    db.studio.googleCalendarRefreshToken = refreshToken;
    db.studio.googleCalendarLastSyncAt = new Date().toISOString();
    delete db.studio.googleCalendarLastSyncError;
  });

  return NextResponse.redirect(`${settingsUrl}?gcal=connected`);
}
