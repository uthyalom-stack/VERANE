"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function SiteFooter() {
  const [settings, setSettings] = useState({});

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

  const siteName = settings.siteName || "VÉRANE";
  const tagline =
    settings.tagline || "Two Brands. One Expression.";

  return (
    <footer className="relative overflow-hidden border-t border-white/[0.08] bg-black text-white">

      {/* SUBTLE AMBIENT GLOW */}
      <div className="pointer-events-none absolute -top-40 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-amber-400/[0.035] blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">

        {/* MAIN FOOTER */}
        <div className="grid gap-12 py-16 sm:py-20 md:grid-cols-4 lg:gap-16">

          {/* BRAND */}
          <div className="md:col-span-1">

            <Link
              href="/"
              className="group inline-flex items-center gap-3"
            >
              {settings.logo ? (
                <img
                  src={settings.logo}
                  alt={siteName}
                  className="max-h-10 max-w-[160px] object-contain"
                />
              ) : (
                <>
                  <span className="h-8 w-px bg-amber-400 transition-all duration-300 group-hover:h-10" />

                  <span className="text-xl font-semibold tracking-[0.08em] transition-colors duration-300 group-hover:text-amber-400">
                    {siteName}
                  </span>
                </>
              )}
            </Link>

            <p className="mt-5 max-w-xs text-sm leading-7 text-white/35">
              {tagline}
            </p>

            <div className="mt-7 flex items-center gap-3">
              <span className="h-px w-8 bg-amber-400/60" />

              <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-white/25">
                Premium Handmade Fashion
              </span>
            </div>
          </div>

          {/* EXPLORE */}
          <div>
            <p className="mb-5 text-[9px] font-bold uppercase tracking-[0.3em] text-amber-400/70">
              Explore
            </p>

            <div className="flex flex-col gap-3">
              <Link
                href="/catalog?brand=UTHY_LUXURY"
                className="group flex items-center gap-2 text-sm text-white/40 transition-colors hover:text-white"
              >
                <span className="h-px w-0 bg-amber-400 transition-all duration-300 group-hover:w-4" />
                UTHY LUXURY
              </Link>

              <Link
                href="/catalog?brand=ALOMZIEE_FOOTIES"
                className="group flex items-center gap-2 text-sm text-white/40 transition-colors hover:text-white"
              >
                <span className="h-px w-0 bg-amber-400 transition-all duration-300 group-hover:w-4" />
                ALOMZIEE FOOTIES
              </Link>

              <Link
                href="/catalog"
                className="group flex items-center gap-2 text-sm text-white/40 transition-colors hover:text-white"
              >
                <span className="h-px w-0 bg-amber-400 transition-all duration-300 group-hover:w-4" />
                Shop
              </Link>

              <Link
                href="/outfit-builder"
                className="group flex items-center gap-2 text-sm text-white/40 transition-colors hover:text-white"
              >
                <span className="h-px w-0 bg-amber-400 transition-all duration-300 group-hover:w-4" />
                Outfit Builder
              </Link>
            </div>
          </div>

          {/* CONTACT */}
          <div>
            <p className="mb-5 text-[9px] font-bold uppercase tracking-[0.3em] text-amber-400/70">
              Contact
            </p>

            <div className="flex flex-col gap-3 text-sm text-white/40">
              {settings.email && (
                <a
                  href={`mailto:${settings.email}`}
                  className="transition-colors hover:text-white"
                >
                  {settings.email}
                </a>
              )}

              {settings.phone && (
                <a
                  href={`tel:${settings.phone}`}
                  className="transition-colors hover:text-white"
                >
                  {settings.phone}
                </a>
              )}

              {settings.whatsapp && (
                <a
                  href={`https://wa.me/${String(
                    settings.whatsapp
                  ).replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors hover:text-white"
                >
                  WhatsApp
                </a>
              )}

              {!settings.email &&
                !settings.phone &&
                !settings.whatsapp && (
                  <span className="text-white/20">
                    Contact details coming soon.
                  </span>
                )}
            </div>
          </div>

          {/* SOCIAL */}
          <div>
            <p className="mb-5 text-[9px] font-bold uppercase tracking-[0.3em] text-amber-400/70">
              Follow
            </p>

            <div className="flex flex-col gap-3">
              {settings.instagram && (
                <a
                  href={settings.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center justify-between text-sm text-white/40 transition-colors hover:text-white"
                >
                  <span>Instagram</span>
                  <span className="translate-x-0 text-white/20 transition-all duration-300 group-hover:translate-x-1 group-hover:text-amber-400">
                    ↗
                  </span>
                </a>
              )}

              {settings.facebook && (
                <a
                  href={settings.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center justify-between text-sm text-white/40 transition-colors hover:text-white"
                >
                  <span>Facebook</span>
                  <span className="translate-x-0 text-white/20 transition-all duration-300 group-hover:translate-x-1 group-hover:text-amber-400">
                    ↗
                  </span>
                </a>
              )}

              {settings.tiktok && (
                <a
                  href={settings.tiktok}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center justify-between text-sm text-white/40 transition-colors hover:text-white"
                >
                  <span>TikTok</span>
                  <span className="translate-x-0 text-white/20 transition-all duration-300 group-hover:translate-x-1 group-hover:text-amber-400">
                    ↗
                  </span>
                </a>
              )}
            </div>
          </div>
        </div>

        {/* BOTTOM BAR */}
        <div className="flex flex-col gap-4 border-t border-white/[0.07] py-6 sm:flex-row sm:items-center sm:justify-between">

          <p className="text-[10px] uppercase tracking-[0.16em] text-white/20">
            © {new Date().getFullYear()} {siteName}. All rights reserved.
          </p>

          <div className="flex items-center gap-5 text-[10px] uppercase tracking-[0.16em] text-white/20">
            <Link
              href="/privacy"
              className="transition-colors hover:text-white/60"
            >
              Privacy
            </Link>

            <Link
              href="/terms"
              className="transition-colors hover:text-white/60"
            >
              Terms
            </Link>
          </div>
        </div>

      </div>
    </footer>
  );
}