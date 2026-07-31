import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { isMissingCryptoSecretError } from "@/lib/crypto-secrets";
import { updateStudioDb } from "@/lib/db/store";
import {
  GOOGLE_OAUTH_STATE_COOKIE,
  googleOAuthStateCookieOptions,
  mintGoogleOAuthState,
} from "@/lib/google-oauth-state";
import { appOrigin } from "@/lib/notify/send";

function googleAuthUrl(
  clientId: string,
  redirectUri: string,
  state: string,
): string {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set(
    "scope",
    "https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly",
  );
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", state);
  return url.toString();
}

function authUrlResponse(
  studioId: string,
  clientId: string,
  extra: Record<string, unknown>,
) {
  const redirect = `${appOrigin()}/api/integrations/google/callback`;
  let minted: ReturnType<typeof mintGoogleOAuthState>;
  try {
    minted = mintGoogleOAuthState(studioId);
  } catch (err) {
    if (isMissingCryptoSecretError(err)) {
      return NextResponse.json(
        { error: "Calendar connect unavailable", configured: false },
        { status: 503 },
      );
    }
    throw err;
  }
  const res = NextResponse.json({
    ...extra,
    authUrl: googleAuthUrl(clientId, redirect, minted.state),
  });
  res.cookies.set(
    GOOGLE_OAUTH_STATE_COOKIE,
    minted.cookieValue,
    googleOAuthStateCookieOptions(),
  );
  return res;
}

/** Start Google Calendar OAuth for the current studio (per-studio refresh token). */
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.json({
      configured: false,
      error: "Calendar connect unavailable",
    });
  }
  return authUrlResponse(admin.studioId, clientId, { configured: true });
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));

  if (body.action === "disconnect") {
    await updateStudioDb(admin.studioId, (db) => {
      db.studio.googleCalendarConnected = false;
      db.studio.googleCalendarRefreshToken = undefined;
      delete db.studio.googleCalendarId;
      delete db.studio.googleCalendarLastSyncAt;
      delete db.studio.googleCalendarLastSyncError;
    });
    return NextResponse.json({ ok: true, connected: false });
  }

  if (body.action === "health") {
    const { probeGoogleCalendarHealth } = await import(
      "@/lib/google-calendar"
    );
    const health = await probeGoogleCalendarHealth(admin.studioId);
    return NextResponse.json(health);
  }

  if (body.action === "calendars") {
    const { listGoogleCalendars } = await import("@/lib/google-calendar");
    const result = await listGoogleCalendars(admin.studioId);
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error || "Could not list calendars", calendars: [] },
        { status: 502 },
      );
    }
    return NextResponse.json({
      calendars: result.calendars,
      selectedId: result.selectedId,
    });
  }

  if (body.action === "setCalendar") {
    const { setGoogleCalendarId } = await import("@/lib/google-calendar");
    const result = await setGoogleCalendarId(
      admin.studioId,
      String(body.calendarId || ""),
    );
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true, calendarId: result.calendarId });
  }

  if (body.action === "busy") {
    const { getBusyIntervals } = await import("@/lib/google-calendar");
    const timeMin = String(body.timeMin || new Date().toISOString());
    const timeMax = String(
      body.timeMax ||
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    );
    const result = await getBusyIntervals({
      studioId: admin.studioId,
      timeMin,
      timeMax,
    });
    return NextResponse.json({
      busy: result.busy,
      syncFailed: result.syncFailed || undefined,
      syncError: result.syncError,
    });
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: "Calendar connect unavailable", configured: false },
      { status: 503 },
    );
  }

  return authUrlResponse(admin.studioId, clientId, {
    ok: true,
    configured: true,
  });
}
