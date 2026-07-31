import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { isMissingCryptoSecretError } from "@/lib/crypto-secrets";
import { readStudioDb, updateStudioDb } from "@/lib/db/store";
import {
  clearGoogleOAuthStateCookieOptions,
  GOOGLE_OAUTH_STATE_COOKIE,
  verifyGoogleOAuthState,
} from "@/lib/google-oauth-state";
import {
  isSealedGoogleRefreshToken,
  sealGoogleRefreshToken,
} from "@/lib/google-token-crypto";
import { appOrigin } from "@/lib/notify/send";

function clearOAuthState(res: NextResponse) {
  res.cookies.set(
    GOOGLE_OAUTH_STATE_COOKIE,
    "",
    clearGoogleOAuthStateCookieOptions(),
  );
  return res;
}

/** OAuth callback — stores this studio's Google Calendar refresh token. */
export async function GET(req: Request) {
  const admin = await requireAdmin();
  const reqUrl = new URL(req.url);
  /** Stay on request host so installed admin PWA does not bounce origins (AURA-294). */
  const browserOrigin = reqUrl.origin;
  const settingsPath = "/admin/settings/integrations";
  const loginUrl = new URL("/admin/login", browserOrigin);
  loginUrl.searchParams.set("next", settingsPath);

  if (!admin) {
    return NextResponse.redirect(loginUrl);
  }

  const code = reqUrl.searchParams.get("code");
  const err = reqUrl.searchParams.get("error");
  const state = reqUrl.searchParams.get("state");
  const jar = await cookies();
  const cookieValue = jar.get(GOOGLE_OAUTH_STATE_COOKIE)?.value;

  if (
    err ||
    !code ||
    !verifyGoogleOAuthState({
      state,
      cookieValue,
      studioId: admin.studioId,
    })
  ) {
    return clearOAuthState(
      NextResponse.redirect(
        new URL(`${settingsPath}?gcal=error`, browserOrigin),
      ),
    );
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return clearOAuthState(
      NextResponse.redirect(
        new URL(`${settingsPath}?gcal=error`, browserOrigin),
      ),
    );
  }

  // Must match the authorize redirect_uri (APP_URL / appOrigin).
  const redirectUri = `${appOrigin()}/api/integrations/google/callback`;
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
    return clearOAuthState(
      NextResponse.redirect(
        new URL(`${settingsPath}?gcal=error`, browserOrigin),
      ),
    );
  }

  const tokens = (await tokenRes.json()) as {
    refresh_token?: string;
    access_token?: string;
  };

  const existing = await readStudioDb(admin.studioId);
  // New tokens from Google are plaintext — seal before persist (AURA-109 / AURA-389).
  // Reuse existing store value as-is when Google omits refresh_token.
  let refreshToken: string | null;
  try {
    refreshToken = tokens.refresh_token
      ? sealGoogleRefreshToken(tokens.refresh_token)
      : existing.studio.googleCalendarRefreshToken
        ? isSealedGoogleRefreshToken(existing.studio.googleCalendarRefreshToken)
          ? existing.studio.googleCalendarRefreshToken
          : sealGoogleRefreshToken(existing.studio.googleCalendarRefreshToken)
        : null;
  } catch (sealErr) {
    if (isMissingCryptoSecretError(sealErr)) {
      return clearOAuthState(
        NextResponse.redirect(
          new URL(`${settingsPath}?gcal=error`, browserOrigin),
        ),
      );
    }
    throw sealErr;
  }
  if (!refreshToken) {
    return clearOAuthState(
      NextResponse.redirect(
        new URL(`${settingsPath}?gcal=error`, browserOrigin),
      ),
    );
  }

  await updateStudioDb(admin.studioId, (db) => {
    db.studio.googleCalendarConnected = true;
    db.studio.googleCalendarRefreshToken = refreshToken;
    db.studio.googleCalendarLastSyncAt = new Date().toISOString();
    delete db.studio.googleCalendarLastSyncError;
  });

  return clearOAuthState(
    NextResponse.redirect(
      new URL(`${settingsPath}?gcal=connected`, browserOrigin),
    ),
  );
}
