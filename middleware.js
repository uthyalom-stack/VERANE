import { NextResponse } from "next/server";

export function middleware(request) {
  const { pathname } = request.nextUrl;

  /*
   * -------------------------------------------------------
   * ADMIN PAGE PROTECTION
   * -------------------------------------------------------
   */

  if (pathname.startsWith("/admin")) {
    const isLoginPage = pathname === "/admin/login";

    if (!isLoginPage) {
      const auth = request.cookies.get("adminAuth")?.value;

      if (!auth) {
        const loginUrl = new URL(
          "/admin/login",
          request.url
        );

        loginUrl.searchParams.set(
          "redirect",
          pathname
        );

        return NextResponse.redirect(loginUrl);
      }
    }
  }

  /*
   * -------------------------------------------------------
   * ADMIN API PROTECTION
   * -------------------------------------------------------
   *
   * Use the same adminAuth cookie that protects the
   * dashboard. Browser fetch requests automatically send
   * same-origin cookies.
   */

  if (pathname.startsWith("/api/admin")) {
    const auth = request.cookies.get("adminAuth")?.value;

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

    /*
     * Validate that the cookie contains usable admin data.
     */
    try {
      const admin = JSON.parse(auth);

      if (
        !admin ||
        !admin.role ||
        !admin.name ||
        !admin.brand
      ) {
        return NextResponse.json(
          {
            error: "Unauthorized",
            message: "Invalid admin authentication.",
          },
          {
            status: 401,
          }
        );
      }
    } catch {
      return NextResponse.json(
        {
          error: "Unauthorized",
          message: "Invalid admin authentication.",
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
   * Prevent browsers from caching admin pages/API responses.
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