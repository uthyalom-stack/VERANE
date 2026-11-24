import "server-only";
import "./globals.css";
import { headers } from "next/headers";

async function getPageContext() {
  const requestHeaders = await headers();
  const pathname = requestHeaders.get("x-verane-pathname") || "";
  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");
  if (isAdminRoute) {
    return { isAdminRoute: true, settings: {} };
  }

  // Keep Prisma/Turso out of the module graph for admin routes. The public
  // storefront can still load its editable settings, but a database outage
  // must never prevent the independent admin login screen from rendering.
  try {
    const { getSiteSettings } = await import("@/lib/site-settings");
    return { isAdminRoute: false, settings: await getSiteSettings() };
  } catch (error) {
    console.error("Site settings unavailable; using storefront defaults:", error);
    return { isAdminRoute: false, settings: {} };
  }
}

export async function generateMetadata() {
  const { isAdminRoute, settings } = await getPageContext();
  const siteName = settings?.siteName || "VÉRANE";
  const tagline = settings?.tagline || "UTHY LUXURY × ALOMZIEE FOOTIES";
  const description = settings?.description || "Two brands. One expression. Premium handmade fashion.";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://verane.vercel.app";

  if (isAdminRoute) {
    return {
      title: "Admin Login | VÉRANE",
      robots: { index: false, follow: false },
    };
  }

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: `${siteName} | ${tagline}`,
      template: `%s | ${siteName}`,
    },
    description,
    applicationName: siteName,
    keywords: [
      "VÉRANE",
      "UTHY LUXURY",
      "ALOMZIEE FOOTIES",
      "premium fashion",
      "luxury clothing",
      "handmade footwear",
      "Nigerian fashion",
    ],
    robots: { index: true, follow: true },
    openGraph: {
      type: "website",
      siteName,
      title: `${siteName} | ${tagline}`,
      description,
      url: siteUrl,
    },
    twitter: {
      card: "summary_large_image",
      title: `${siteName} | ${tagline}`,
      description,
    },
    icons: { icon: "/favicon.ico" },
  };
}

export default async function RootLayout({ children }) {
  const { isAdminRoute, settings } = await getPageContext();
  const primaryColor = settings?.primaryColor || "#f5b942";

  const StorefrontHeader = isAdminRoute
    ? null
    : (await import("@/components/StorefrontHeader")).default;
  const MobileBrandRedirect = isAdminRoute
    ? null
    : (await import("@/components/MobileBrandRedirect")).default;

  return (
    <html lang="en">
      <body
        className="min-h-screen bg-black text-white antialiased pb-20 md:pb-0"
        style={{ "--primary-color": primaryColor }}
      >
        {!isAdminRoute && (
          <>
            <StorefrontHeader />
            <MobileBrandRedirect />
          </>
        )}
        {children}
      </body>
    </html>
  );
}
