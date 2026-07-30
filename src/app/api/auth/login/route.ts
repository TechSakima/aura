import { NextResponse } from "next/server";
import { loginWithFirebaseIdToken } from "@/lib/auth";
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
  return NextResponse.json({ ok: true });
}
