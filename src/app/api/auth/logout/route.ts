import { NextResponse } from "next/server";
import { clearSessionCookieOptions, logout, SESSION_COOKIE } from "@/lib/auth";

/**
 * Clears Aura session cookie + Firestore auth session row only.
 * Client must also Firebase `signOut` via `clientLogout` (AURA-110) or silent restore re-mints.
 */
export async function POST() {
  await logout();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", clearSessionCookieOptions());
  return res;
}
