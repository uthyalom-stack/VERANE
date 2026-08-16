import "./globals.css";

export const metadata = {
  title: "Verane | UTHY LUXURY × ALOMZIEE FOOTIES",
  description: "Two brands. One expression. Premium handmade fashion.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-black text-white min-h-screen antialiased">
        <nav className="sticky top-0 z-50 bg-black/80 backdrop-blur-lg border-b border-white/5">
          <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
            <a href="/" className="text-xl font-black tracking-tight">
              <span className="text-amber-500">VERANE</span>
            </a>
            <div className="hidden md:flex items-center gap-6 text-sm">
              <a href="/catalog?brand=UTHY_LUXURY" className="text-neutral-400 hover:text-white transition">UTHY LUXURY</a>
              <a href="/catalog?brand=ALOMZIEE_FOOTIES" className="text-neutral-400 hover:text-white transition">ALOMZIEE</a>
              <a href="/outfit-builder" className="text-neutral-400 hover:text-white transition">Outfit Builder</a>
              <a href="/cart" className="text-neutral-400 hover:text-white transition">Cart</a>
              <a href="/login" className="text-neutral-400 hover:text-white transition">Login</a>
            </div>
            <button className="md:hidden text-white text-2xl">☰</button>
          </div>
        </nav>
        <main>{children}</main>
      </body>
    </html>
  );
}