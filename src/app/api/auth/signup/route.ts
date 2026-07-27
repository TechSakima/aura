import { NextResponse } from "next/server";
import { signupWithFirebaseIdToken } from "@/lib/auth";
import { firebaseReady } from "@/lib/db/require-firebase";

export async function POST(req: Request) {
  if (!firebaseReady()) {
    return NextResponse.json(
      { error: "Firebase is not configured" },
      { status: 503 },
    );
  }

  const body = (await req.json()) as { idToken?: string; studioName?: string };
  if (!body.idToken) {
    return NextResponse.json(
      { error: "Firebase sign-in required" },
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
  return NextResponse.json({
    ok: true,
    studioId: result.studioId,
    claimed: result.claimed,
  });
}
