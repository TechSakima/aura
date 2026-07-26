import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!pathname.startsWith("/admin")) return NextResponse.next();

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-aura-pathname", pathname);

  if (pathname.startsWith("/admin/login")) {
    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  }

  const session = req.cookies.get("aura_session");
  if (!session?.value) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: ["/admin/:path*"],
};
