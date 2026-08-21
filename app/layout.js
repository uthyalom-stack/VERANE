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
      <body className="bg-black text-white min-h-screen antialiased">
        <StorefrontHeader />
        {children}
      </body>
    </html>
  );
}