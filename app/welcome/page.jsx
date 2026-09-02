"use client";

import Link from "next/link";
import SiteFooter from "@/components/SiteFooter";

export default function WelcomePage() {
  return (
    <main className="min-h-screen bg-black text-white flex flex-col justify-between">
      <div className="max-w-4xl mx-auto px-5 sm:px-8 py-20 md:py-32 text-center my-auto">
        <p className="text-amber-400 text-xs font-bold uppercase tracking-[0.4em]">
          VÉRANE PRIVATE ACCESS
        </p>

        <h1 className="text-5xl sm:text-7xl md:text-8xl font-black tracking-tighter mt-4 leading-none">
          WELCOME TO <span className="text-amber-400">VÉRANE</span>
        </h1>

        <p className="mt-8 text-neutral-300 text-base md:text-xl max-w-2xl mx-auto leading-relaxed font-light">
          Your private member account is now active. You have full access to custom tailoring from <strong className="text-white">UTHY LUXURY</strong> and bespoke footwear from <strong className="text-white">ALOMZIEE FOOTIES</strong>.
        </p>

        <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/catalog"
            className="w-full sm:w-auto px-8 py-4 rounded-full bg-amber-500 text-black text-xs font-black uppercase tracking-widest hover:bg-amber-400 transition"
          >
            Explore Catalog
          </Link>

          <Link
            href="/account"
            className="w-full sm:w-auto px-8 py-4 rounded-full border border-white/20 text-white text-xs font-black uppercase tracking-widest hover:bg-white hover:text-black transition"
          >
            View My Account
          </Link>
        </div>

        <p className="mt-8 text-[11px] text-neutral-500 uppercase tracking-widest">
          A confirmation welcome email has been dispatched to your inbox.
        </p>
      </div>

      <SiteFooter />
    </main>
  );
}
