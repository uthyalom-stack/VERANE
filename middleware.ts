import { NextResponse } from "next/server";

/**
 * Keep this as Edge middleware rather than Next.js 16 proxy.ts.
 * The pathname header lets the root layout avoid importing storefront-only
 * database modules while rendering the public admin login route.
 */
export function middleware(request: Request) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-verane-pathname", pathname);

  const authRequiredMap: Record<string, boolean> = {
    "/admin/login": false,
  };

  if (
    pathname.startsWith("/admin") &&
    (authRequiredMap[pathname] ?? true)
  ) {
    const cookieHeader = request.headers.get("cookie") || "";
    const hasAdminAuth = cookieHeader
      .split(";")
      .some((cookie) => cookie.trim().startsWith("adminAuth="));

    if (!hasAdminAuth) {
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  if (pathname.startsWith("/api/admin")) {
    if (pathname !== "/api/admin/login") {
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
  }

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/api/admin")
  ) {
    response.headers.set("Cache-Control", "no-store, max-age=0");
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
