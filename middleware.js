import { NextResponse } from "next/server";

export function middleware(request) {
  const { pathname } = request.nextUrl;

  /*
   * -------------------------------------------------------
   * ADMIN PAGE PROTECTION
   * -------------------------------------------------------
   *
   * Everything under /admin requires the adminAuth cookie,
   * except /admin/login.
   */

  if (pathname.startsWith("/admin")) {
    const isLoginPage = pathname === "/admin/login";

    if (!isLoginPage) {
      const auth = request.cookies.get("adminAuth")?.value;

      if (!auth) {
        const loginUrl = new URL("/admin/login", request.url);

        // Remember where the admin was trying to go.
        loginUrl.searchParams.set("redirect", pathname);

        return NextResponse.redirect(loginUrl);
      }
    }
  }

  /*
   * -------------------------------------------------------
   * ADMIN API PROTECTION
   * -------------------------------------------------------
   *
   * API routes under /api/admin require the existing
   * x-admin-auth header.
   */

  if (pathname.startsWith("/api/admin")) {
    const auth = request.headers.get("x-admin-auth");

    if (!auth) {
      return NextResponse.json(
        {
          error: "Unauthorized",
          message: "Admin authentication required.",
        },
        {
          status: 401,
        }
      );
    }
  }

  /*
   * -------------------------------------------------------
   * SECURITY HEADERS
   * -------------------------------------------------------
   */

  const response = NextResponse.next();

  response.headers.set(
    "X-Content-Type-Options",
    "nosniff"
  );

  response.headers.set(
    "X-Frame-Options",
    "SAMEORIGIN"
  );

  response.headers.set(
    "Referrer-Policy",
    "strict-origin-when-cross-origin"
  );

  /*
   * Prevent browsers from caching admin pages.
   */

  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/api/admin")
  ) {
    response.headers.set(
      "Cache-Control",
      "no-store, max-age=0"
    );
  }

  return response;
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/admin/:path*",
  ],
};