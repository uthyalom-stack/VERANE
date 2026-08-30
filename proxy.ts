import { NextResponse } from "next/server";

export function proxy(request: Request) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  /*
   * -------------------------------------------------------
   * ADMIN PAGE AUTHENTICATION
   * -------------------------------------------------------
   */

  const authRequiredMap: Record<string, boolean> = {
    "/admin/login": false
  };

  if (pathname.startsWith("/admin") && (authRequiredMap[pathname] ?? true)) {
    const cookieHeader = request.headers.get("cookie") || "";

    const hasAdminAuth = cookieHeader
      .split(";")
      .some((cookie) => cookie.trim().startsWith("adminAuth="));

    if (!hasAdminAuth) {
      console.log("[ADMIN AUTH]", pathname, "NO COOKIE");

      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);

        return NextResponse.redirect(loginUrl);
      }

      console.log("[ADMIN AUTH]", pathname, "COOKIE FOUND");
    }
  }

  /*
   * -------------------------------------------------------
   * ADMIN API AUTHENTICATION
   * -------------------------------------------------------
   */

  if (pathname.startsWith("/api/admin")) {
    /*
     * Login itself must remain public.
     */
    if (pathname === "/api/admin/login") {
      return NextResponse.next();
    }

    const cookieHeader = request.headers.get("cookie") || "";

    const hasAdminAuth = cookieHeader
      .split(";")
      .some((cookie) => cookie.trim().startsWith("adminAuth="));

    if (!hasAdminAuth) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
          message: "Admin authentication required.",
        },
        { status: 401 }
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