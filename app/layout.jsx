import "./globals.css";
import { getSiteSettings } from "@/lib/site-settings";
import StorefrontHeader from "@/components/StorefrontHeader";
import MobileBrandRedirect from "@/components/MobileBrandRedirect";

export async function generateMetadata() {
  const settings = await getSiteSettings();

  const siteName = settings?.siteName || "VÉRANE";
  const tagline = settings?.tagline || "UTHY LUXURY × ALOMZIEE FOOTIES";
  const description = settings?.description || "Two brands. One expression. Premium handmade fashion.";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://verane.vercel.app";

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
  const settings = await getSiteSettings();
  const primaryColor = settings?.primaryColor || "#f5b942";

  return (
    <html lang="en">
      <body
        className="min-h-screen bg-black text-white antialiased"
        style={{ "--primary-color": primaryColor }}
      >
        <StorefrontHeader />
        <MobileBrandRedirect />
        {children}
      </body>
    </html>
  );
}
