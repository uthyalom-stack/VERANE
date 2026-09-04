"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import SiteFooter from "@/components/SiteFooter";

/**
 * Renders the VÉRANE private-access welcome page with animated content and navigation links.
 * @returns {JSX.Element} The welcome page layout.
 */
export default function WelcomePage() {
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    // Trigger luxury reveal animation
    const timer = setTimeout(() => {
      setAnimated(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  return (
    <main className="min-h-screen bg-black text-white flex flex-col justify-between overflow-x-hidden selection:bg-amber-400 selection:text-black">
      {/* SUBTLE GOLD PARTICLES CONTAINER */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden opacity-30">
        <div className="absolute top-1/4 left-1/4 w-2 h-2 rounded-full bg-amber-400 blur-[1px] animate-ping duration-[3000ms]" />
        <div className="absolute top-1/3 right-1/3 w-1.5 h-1.5 rounded-full bg-amber-300 blur-[1px] animate-pulse duration-[2500ms]" />
        <div className="absolute bottom-1/3 left-1/2 w-2 h-2 rounded-full bg-amber-500 blur-[2px] animate-pulse duration-[4000ms]" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-5 sm:px-8 py-20 md:py-32 text-center my-auto">
        <p className="text-amber-400 text-[10px] sm:text-xs font-bold uppercase tracking-[0.45em] transition-all duration-1000 transform opacity-90">
          VÉRANE PRIVATE ACCESS
        </p>

        {/* HEADLINE WITH GOLD LINE-DRAW REVEAL */}
        <div className="relative inline-block mt-4">
          <h1
            className={`text-5xl sm:text-7xl md:text-8xl font-black tracking-tighter transition-all duration-1000 transform ${
              animated ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            VÉRANE <span className="text-amber-400">WELCOMES</span> YOU
          </h1>

          {/* ELEGANT TAILORED GOLD LINE DRAW */}
          <div
            className={`h-[2px] bg-gradient-to-r from-transparent via-amber-400 to-transparent mt-3 transition-all duration-1000 ease-out mx-auto ${
              animated ? "w-full opacity-100" : "w-0 opacity-0"
            }`}
          />
        </div>

        <p
          className={`mt-8 text-neutral-300 text-base sm:text-lg md:text-2xl max-w-2xl mx-auto leading-relaxed font-light transition-all duration-1000 delay-300 transform ${
            animated ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          Your private atelier is now open.<br />
          <span className="text-neutral-400 text-sm md:text-base mt-2 block">
            From the first stitch at <strong className="text-amber-400 font-semibold">UTHY LUXURY</strong> to the last sole at <strong className="text-amber-400 font-semibold">ALOMZIEE FOOTIES</strong> — everything is made to your measure.
          </span>
        </p>

        {/* ACTION BUTTONS */}
        <div
          className={`mt-12 flex flex-col sm:flex-row items-center justify-center gap-4 transition-all duration-1000 delay-500 transform ${
            animated ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          <Link
            href="/catalog"
            className="w-full sm:w-auto px-9 py-4 rounded-full bg-amber-500 text-black text-xs font-black uppercase tracking-[0.2em] hover:bg-amber-400 transition shadow-[0_0_30px_rgba(245,185,66,0.2)] hover:shadow-[0_0_40px_rgba(245,185,66,0.4)]"
          >
            DISCOVER YOUR FIT
          </Link>

          <Link
            href="/account"
            className="w-full sm:w-auto px-9 py-4 rounded-full border border-white/20 text-white text-xs font-black uppercase tracking-[0.2em] hover:bg-white hover:text-black transition"
          >
            MY ACCOUNT
          </Link>
        </div>

        <p
          className={`mt-10 text-[10px] text-neutral-500 uppercase tracking-[0.25em] transition-all duration-1000 delay-700 ${
            animated ? "opacity-100" : "opacity-0"
          }`}
        >
          A confirmation welcome email has been dispatched to your inbox.
        </p>
      </div>

      <SiteFooter />
    </main>
  );
}
