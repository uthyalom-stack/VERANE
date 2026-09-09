"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function SiteFooter() {
  const [settings, setSettings] = useState({});

  useEffect(() => {
    let mounted = true;

    fetch("/api/settings")
      .then((response) => response.json())
      .then((data) => {
        if (mounted) {
          setSettings(data || {});
        }
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, []);

  const footerNav = [
    { label: "Atelier Catalog", href: "/catalog" },
    { label: "UTHY LUXURY", href: "/catalog?brand=UTHY_LUXURY" },
    { label: "ALOMZIEE FOOTIES", href: "/catalog?brand=ALOMZIEE_FOOTIES" },
    { label: "Capsule Collaborations", href: "/collaborations" },
    { label: "Realtime Outfit Builder", href: "/outfit-builder" },
    { label: "Shopping Bag", href: "/cart" },
  ];

  const currentYear = new Date().getFullYear();
  const siteName = settings.siteName || "VÉRANE";

  const socialLinks = [
    { name: "Instagram", url: settings.instagram },
    { name: "Facebook", url: settings.facebook },
    { name: "TikTok", url: settings.tiktok },
  ].filter((item) => item.url);

  return (
    <footer className="relative overflow-hidden border-t border-white/[0.08] bg-[#050505] text-[#f5f5f5]">
      {/* Ambient luxury ambient light */}
      <div
        className="pointer-events-none absolute left-1/2 top-0 h-[300px] w-[600px] -translate-x-1/2 rounded-full opacity-[0.05] blur-[120px]"
        style={{ background: "#f5b942" }}
      />

      <div className="relative mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
        <div className="grid gap-12 py-16 lg:py-24 lg:grid-cols-12 lg:gap-8">
          {/* BRAND COL */}
          <div className="lg:col-span-5">
            <Link href="/" className="inline-block">
              <span className="text-3xl font-editorial font-light tracking-wider text-white transition hover:text-amber-400">
                {siteName}
              </span>
            </Link>

            <div className="mt-4 flex items-center gap-3">
              <span className="h-px w-6 bg-amber-400" />
              <span className="text-[9px] font-bold uppercase tracking-couture text-amber-400">
                ATELIER COUTURE DARKNESS
              </span>
            </div>

            <p className="mt-4 max-w-sm text-xs sm:text-sm font-light text-neutral-400 leading-relaxed">
              Two expressions. One philosophy. Luxury garments from UTHY LUXURY and handcrafted footwear from ALOMZIEE FOOTIES for individuals who refuse to look ordinary.
            </p>

            {socialLinks.length > 0 && (
              <div className="mt-8 flex flex-wrap gap-2.5">
                {socialLinks.map((social) => (
                  <a
                    key={social.name}
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full border border-white/10 bg-white/[0.02] px-4 py-2 text-[10px] font-bold uppercase tracking-luxury text-neutral-400 transition hover:border-amber-400/40 hover:bg-amber-400/10 hover:text-amber-400"
                  >
                    {social.name}
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* EXPLORE COL */}
          <div className="lg:col-span-3">
            <p className="mb-6 text-[9px] font-bold uppercase tracking-couture text-amber-400">
              EXPLORE THE HOUSE
            </p>

            <div className="space-y-3.5">
              {footerNav.map((link) => (
                <Link
                  key={`${link.label}-${link.href}`}
                  href={link.href}
                  className="group flex items-center gap-2 text-xs sm:text-sm text-neutral-400 font-light transition hover:text-white"
                >
                  <span className="h-px w-0 bg-amber-400 transition-all duration-300 group-hover:w-3" />
                  <span>{link.label}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* CONTACT COL */}
          <div className="lg:col-span-4">
            <p className="mb-6 text-[9px] font-bold uppercase tracking-couture text-amber-400">
              CONCIERGE & SUPPORT
            </p>

            <div className="space-y-4 text-xs sm:text-sm font-light text-neutral-400">
              {settings.email && (
                <div>
                  <p className="text-[9px] uppercase tracking-luxury text-neutral-600 mb-0.5">Email Concierge</p>
                  <a href={`mailto:${settings.email}`} className="text-white hover:text-amber-400 transition">
                    {settings.email}
                  </a>
                </div>
              )}

              {settings.phone && (
                <div>
                  <p className="text-[9px] uppercase tracking-luxury text-neutral-600 mb-0.5">Direct Line</p>
                  <a href={`tel:${settings.phone}`} className="text-white hover:text-amber-400 transition">
                    {settings.phone}
                  </a>
                </div>
              )}

              {settings.whatsapp && (
                <div>
                  <p className="text-[9px] uppercase tracking-luxury text-neutral-600 mb-0.5">WhatsApp VIP Care</p>
                  <a
                    href={`https://wa.me/${String(settings.whatsapp).replace(/[^0-9]/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-amber-400 hover:text-amber-300 transition"
                  >
                    Connect on WhatsApp →
                  </a>
                </div>
              )}

              {!settings.email && !settings.phone && !settings.whatsapp && (
                <p className="text-neutral-600 text-xs">
                  VÉRANE Client Services & Concierge
                </p>
              )}
            </div>
          </div>
        </div>

        {/* BOTTOM LEGAL BAR */}
        <div className="flex flex-col gap-4 border-t border-white/[0.06] py-8 sm:flex-row sm:items-center sm:justify-between text-[10px] uppercase tracking-luxury text-neutral-500">
          <p>
            {settings.footerText || `© ${currentYear} ${siteName} HOUSE. All rights reserved.`}
          </p>

          <div className="flex items-center gap-4">
            <Link href="/" className="hover:text-white transition">
              VÉRANE
            </Link>
            <span className="h-3 w-px bg-white/10" />
            <Link href="/catalog?brand=UTHY_LUXURY" className="hover:text-white transition">
              UTHY LUXURY
            </Link>
            <span className="h-3 w-px bg-white/10" />
            <Link href="/catalog?brand=ALOMZIEE_FOOTIES" className="hover:text-white transition">
              ALOMZIEE FOOTIES
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
