import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { safeAdminNext } from "@/lib/safe-admin-next";
import {
  clearSessionCookieOptions,
  SESSION_COOKIE,
  verifySessionCookie,
} from "@/lib/session-cookie";

/**
 * Admin gate (AURA-104):
 * - Middleware verifies signed cookie + expiry (Edge-safe HMAC). No Firestore.
 * - Layout `requireAdmin` is authoritative for session row + studio.
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!pathname.startsWith("/admin")) return NextResponse.next();

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-aura-pathname", pathname);
  requestHeaders.set("x-aura-search", req.nextUrl.search || "");

  if (pathname.startsWith("/admin/login")) {
    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  }

  const raw = req.cookies.get(SESSION_COOKIE)?.value;
  const verified = await verifySessionCookie(raw);
  if (!verified) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = "";
    const next = safeAdminNext(`${pathname}${req.nextUrl.search}`);
    url.searchParams.set("next", next);
    const res = NextResponse.redirect(url);
    // Drop invalid/legacy cookies so we don't keep failing the HMAC check.
    if (raw) {
      res.cookies.set(SESSION_COOKIE, "", clearSessionCookieOptions());
    }
    return res;
  }

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: ["/admin/:path*"],
};
