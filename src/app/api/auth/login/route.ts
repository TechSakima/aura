import { NextResponse } from "next/server";
import {
  loginWithFirebaseIdToken,
  mintAuthCookieValue,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/lib/auth";
import { isMissingCryptoSecretError } from "@/lib/crypto-secrets";
import { firebaseReady } from "@/lib/db/require-firebase";
import { clientIp, rateLimitShared } from "@/lib/rate-limit";

export async function POST(req: Request) {
  if (!firebaseReady()) {
    return NextResponse.json(
      { error: "Sign-in is unavailable. Try again later." },
      { status: 503 },
    );
  }

  const limited = await rateLimitShared(
    `auth-login:${clientIp(req)}`,
    20,
    15 * 60_000,
  );
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many attempts. Try again shortly." },
      {
        status: 429,
        headers: { "Retry-After": String(limited.retryAfterSec) },
      },
    );
  }

  const body = (await req.json()) as { idToken?: string };
  if (!body.idToken) {
    return NextResponse.json(
      { error: "Sign-in required" },
      { status: 401 },
    );
  }
  const result = await loginWithFirebaseIdToken(body.idToken);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 401 });
  }

  try {
    const cookieValue = await mintAuthCookieValue(result.token, result.expiresAt);
    const res = NextResponse.json({ ok: true });
    res.cookies.set(
      SESSION_COOKIE,
      cookieValue,
      sessionCookieOptions(new Date(result.expiresAt)),
    );
    return res;
  } catch (err) {
    if (isMissingCryptoSecretError(err)) {
      return NextResponse.json(
        { error: "Sign-in is unavailable. Try again later." },
        { status: 503 },
      );
    }
    throw err;
  }
}
