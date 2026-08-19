import { NextResponse } from "next/server";

export function middleware(request) {
  const { pathname } = request.nextUrl;

  /*
   * -------------------------------------------------------
   * ADMIN AUTHENTICATION
   * -------------------------------------------------------
   *
   * All /admin pages require the adminAuth cookie,
   * except /admin/login.
   */

  if (pathname.startsWith("/admin")) {
    const isLoginPage = pathname === "/admin/login";

    if (!isLoginPage) {
      const auth = request.cookies.get("adminAuth")?.value;

      if (!auth) {
        const loginUrl = new URL("/admin/login", request.url);

        loginUrl.searchParams.set("redirect", pathname);

        return NextResponse.redirect(loginUrl);
      }
    }
  }

  /*
   * -------------------------------------------------------
   * ADMIN API AUTHENTICATION
   * -------------------------------------------------------
   *
   * Admin API routes use the SAME adminAuth cookie.
   *
   * This means the browser does not need to manually send
   * an x-admin-auth header for every request.
   */

  if (pathname.startsWith("/api/admin")) {
    const auth = request.cookies.get("adminAuth")?.value;

    if (!auth) {
      return NextResponse.json(
        {
          success: false,
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
   * Prevent caching of admin pages and APIs.
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