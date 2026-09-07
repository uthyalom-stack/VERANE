import "./globals.css";
import StorefrontHeader from "@/components/StorefrontHeader";

export const metadata = {
  title: "VÉRANE | UTHY LUXURY × ALOMZIEE FOOTIES",
  description:
    "Two brands. One expression. Premium handmade fashion.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-black text-white min-h-screen antialiased pb-20 md:pb-0">
        <StorefrontHeader />
        {children}
      </body>
    </html>
  );
}