import { NextResponse } from "next/server";
import {
  mintAuthCookieValue,
  SESSION_COOKIE,
  sessionCookieOptions,
  signupWithFirebaseIdToken,
} from "@/lib/auth";
import { isMissingCryptoSecretError } from "@/lib/crypto-secrets";
import { firebaseReady } from "@/lib/db/require-firebase";
import { clientIp, rateLimitShared } from "@/lib/rate-limit";

export async function POST(req: Request) {
  if (!firebaseReady()) {
    return NextResponse.json(
      { error: "Sign-up is unavailable. Try again later." },
      { status: 503 },
    );
  }

  const limited = await rateLimitShared(
    `auth-signup:${clientIp(req)}`,
    5,
    60 * 60_000,
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

  const body = (await req.json()) as { idToken?: string; studioName?: string };
  if (!body.idToken) {
    return NextResponse.json(
      { error: "Sign-in required" },
      { status: 401 },
    );
  }
  if (!body.studioName?.trim()) {
    return NextResponse.json(
      { error: "Studio name is required" },
      { status: 400 },
    );
  }

  const result = await signupWithFirebaseIdToken({
    idToken: body.idToken,
    studioName: body.studioName,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  try {
    const cookieValue = await mintAuthCookieValue(result.token, result.expiresAt);
    const res = NextResponse.json({
      ok: true,
      studioId: result.studioId,
      claimed: result.claimed,
    });
    res.cookies.set(
      SESSION_COOKIE,
      cookieValue,
      sessionCookieOptions(new Date(result.expiresAt)),
    );
    return res;
  } catch (err) {
    if (isMissingCryptoSecretError(err)) {
      return NextResponse.json(
        { error: "Sign-up is unavailable. Try again later." },
        { status: 503 },
      );
    }
    throw err;
  }
}
