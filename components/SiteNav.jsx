"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function SiteNav() {
  const [settings, setSettings] = useState({});
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((response) => response.json())
      .then((data) => {
        setSettings(data || {});
      })
      .catch(() => {
        setSettings({});
      });
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 12);
    };

    window.addEventListener("scroll", handleScroll);

    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const navLinks = [
    {
      href: "/catalog?brand=UTHY_LUXURY",
      label: "UTHY LUXURY",
    },
    {
      href: "/catalog?brand=ALOMZIEE_FOOTIES",
      label: "ALOMZIEE",
    },
    {
      href: "/outfit-builder",
      label: "Outfit Builder",
    },
    {
      href: "/catalog",
      label: "Shop",
    },
    {
      href: "/cart",
      label: "Cart",
    },
  ];

  return (
    <>
      {/* ANNOUNCEMENT BAR */}
      {settings.announcementEnabled === "true" &&
        settings.announcementText && (
          <div className="relative z-[60] overflow-hidden bg-amber-400 px-4 py-2.5 text-center text-[10px] font-bold uppercase tracking-[0.18em] text-black">
            <p className="truncate">
              {settings.announcementText}
            </p>
          </div>
        )}

      {/* NAVIGATION */}
      <nav
        className={`sticky top-0 z-50 transition-all duration-300 ${
          scrolled
            ? "border-white/[0.09] bg-black/90 shadow-2xl shadow-black/20 backdrop-blur-2xl"
            : "border-white/[0.06] bg-black/70 backdrop-blur-xl"
        } border-b`}
      >
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-10">

          {/* BRAND */}
          <Link
            href="/"
            className="group flex min-w-0 items-center"
            onClick={() => setMenuOpen(false)}
          >
            {settings.logo ? (
              <img
                src={settings.logo}
                alt={settings.siteName || "VÉRANE"}
                className="max-h-9 max-w-[150px] object-contain"
              />
            ) : (
              <div className="flex items-center gap-3">
                <span className="h-7 w-px bg-amber-400 transition-all duration-300 group-hover:h-9" />

                <span className="text-lg font-semibold tracking-[0.08em] text-white transition-colors duration-300 group-hover:text-amber-400 sm:text-xl">
                  {settings.siteName || "VÉRANE"}
                </span>
              </div>
            )}
          </Link>

          {/* DESKTOP NAV */}
          <div className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="group relative rounded-full px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/45 transition-all duration-300 hover:bg-white/[0.04] hover:text-white"
              >
                {link.label}

                <span className="absolute bottom-1 left-1/2 h-px w-0 -translate-x-1/2 bg-amber-400 transition-all duration-300 group-hover:w-5" />
              </Link>
            ))}
          </div>

          {/* MOBILE BUTTON */}
          <button
            type="button"
            aria-label={
              menuOpen
                ? "Close navigation menu"
                : "Open navigation menu"
            }
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((current) => !current)}
            className="group flex h-11 w-11 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.025] transition hover:border-amber-400/30 hover:bg-white/[0.05] md:hidden"
          >
            <span className="relative flex h-4 w-5 flex-col justify-between">
              <span
                className={`h-px w-full bg-white transition-all duration-300 ${
                  menuOpen
                    ? "translate-y-[7px] rotate-45"
                    : ""
                }`}
              />

              <span
                className={`h-px w-full bg-white transition-all duration-300 ${
                  menuOpen ? "opacity-0" : ""
                }`}
              />

              <span
                className={`h-px w-full bg-white transition-all duration-300 ${
                  menuOpen
                    ? "-translate-y-[7px] -rotate-45"
                    : ""
                }`}
              />
            </span>
          </button>
        </div>

        {/* MOBILE MENU */}
        <div
          className={`overflow-hidden border-t border-white/[0.06] transition-all duration-500 md:hidden ${
            menuOpen
              ? "max-h-[500px] opacity-100"
              : "max-h-0 opacity-0"
          }`}
        >
          <div className="mx-auto max-w-7xl px-5 py-5 sm:px-8">

            <div className="mb-4 flex items-center gap-3">
              <span className="h-px w-6 bg-amber-400" />

              <span className="text-[9px] font-bold uppercase tracking-[0.28em] text-amber-400/70">
                Explore
              </span>
            </div>

            <div className="flex flex-col">
              {navLinks.map((link, index) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="group flex items-center justify-between border-b border-white/[0.06] py-4"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-[9px] tracking-[0.2em] text-white/20">
                      0{index + 1}
                    </span>

                    <span className="text-sm font-semibold uppercase tracking-[0.1em] text-white/60 transition group-hover:text-white">
                      {link.label}
                    </span>
                  </div>

                  <span className="text-white/20 transition group-hover:translate-x-1 group-hover:text-amber-400">
                    →
                  </span>
                </Link>
              ))}
            </div>

            {/* MOBILE BRAND TAGLINE */}
            <div className="pt-6">
              <p className="text-[9px] uppercase tracking-[0.25em] text-white/20">
                {settings.tagline ||
                  "Two Brands. One Expression."}
              </p>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}