import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { updateStudioDb } from "@/lib/db/store";
import { appOrigin } from "@/lib/notify/send";

/** OAuth callback — stores refresh token when Google credentials are configured. */
export async function GET(req: Request) {
  const admin = await requireAdmin();
  const origin = appOrigin();
  const settingsUrl = `${origin}/admin/settings`;

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
    await updateStudioDb(admin.studioId, (db) => {
      db.studio.googleCalendarConnected = true;
    });
    return NextResponse.redirect(`${settingsUrl}?gcal=stub`);
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

  await updateStudioDb(admin.studioId, (db) => {
    db.studio.googleCalendarConnected = true;
    if (tokens.refresh_token) {
      db.studio.googleCalendarRefreshToken = tokens.refresh_token;
    }
  });

  return NextResponse.redirect(`${settingsUrl}?gcal=connected`);
}
