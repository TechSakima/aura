import { NextResponse } from "next/server";
import {
  loginWithFirebaseIdToken,
  mintAuthCookieValue,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/lib/auth";
import { firebaseReady } from "@/lib/db/require-firebase";

export async function POST(req: Request) {
  if (!firebaseReady()) {
    return NextResponse.json(
      { error: "Sign-in is unavailable. Try again later." },
      { status: 503 },
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

  const cookieValue = await mintAuthCookieValue(result.token, result.expiresAt);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(
    SESSION_COOKIE,
    cookieValue,
    sessionCookieOptions(new Date(result.expiresAt)),
  );
  return res;
}
