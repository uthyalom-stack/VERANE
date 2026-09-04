"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/**
 * Render the configurable site footer with navigation, social links, contact details, and branding.
 */
export default function SiteFooter() {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    fetch("/api/settings")
      .then((response) => response.json())
      .then((data) => {
        if (mounted) {
          setSettings(data || {});
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const footerNav = [];

  if (settings.navItems) {
    settings.navItems
      .split("\n")
      .slice(0, 6)
      .forEach((line) => {
        const parts = line.split(":");

        if (parts.length >= 2) {
          const label = parts[0].trim();
          const href = parts.slice(1).join(":").trim();

          if (label && href) {
            footerNav.push({ label, href });
          }
        }
      });
  }

  if (footerNav.length === 0) {
    footerNav.push(
      { label: "Shop", href: "/catalog" },
      {
        label: "UTHY LUXURY",
        href: "/catalog?brand=UTHY_LUXURY",
      },
      {
        label: "ALOMZIEE",
        href: "/catalog?brand=ALOMZIEE_FOOTIES",
      },
      {
        label: "Outfit Builder",
        href: "/outfit-builder",
      },
      { label: "Cart", href: "/cart" }
    );
  }

  const currentYear = new Date().getFullYear();

  const siteName = settings.siteName || "VÉRANE";
  const tagline =
    settings.tagline || "Two Brands. One Expression.";

  const socialLinks = [
    {
      name: "Instagram",
      url: settings.instagram,
    },
    {
      name: "Facebook",
      url: settings.facebook,
    },
    {
      name: "TikTok",
      url: settings.tiktok,
    },
  ].filter((item) => item.url);

  return (
    <footer className="relative overflow-hidden border-t border-white/[0.08] bg-black text-white">
      {/* Ambient luxury glow */}
      <div
        className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[700px] -translate-x-1/2 rounded-full opacity-[0.06] blur-[120px]"
        style={{
          background:
            settings.primaryColor || "#f5b942",
        }}
      />

      <div className="relative mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
        {/* Main footer */}
        <div className="grid gap-12 py-16 sm:py-20 lg:grid-cols-12 lg:gap-8">
          {/* Brand */}
          <div className="lg:col-span-5">
            <Link
              href="/"
              className="group inline-flex items-center"
            >
              <span className="text-2xl font-black tracking-[-0.04em] text-white transition duration-300 group-hover:text-amber-400">
                {siteName}
              </span>
            </Link>

            <div className="mt-5 flex items-center gap-3">
              <span className="h-px w-8 bg-amber-400" />

              <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-amber-400/70">
                Premium Fashion
              </span>
            </div>

            <p className="mt-5 max-w-sm text-sm leading-7 text-white/40">
              {tagline}
            </p>

            <p className="mt-4 max-w-sm text-xs leading-6 text-white/25">
              UTHY LUXURY × ALOMZIEE FOOTIES
            </p>

            {/* Social links */}
            {socialLinks.length > 0 && (
              <div className="mt-8 flex flex-wrap gap-3">
                {socialLinks.map((social) => (
                  <a
                    key={social.name}
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full border border-white/[0.08] bg-white/[0.025] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-white/45 transition duration-300 hover:border-amber-400/30 hover:bg-amber-400/[0.06] hover:text-amber-400"
                  >
                    {social.name}
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Explore */}
          <div className="lg:col-span-3">
            <p className="mb-5 text-[9px] font-bold uppercase tracking-[0.3em] text-amber-400/70">
              Explore
            </p>

            <div className="space-y-3">
              {footerNav.map((link) => (
                <Link
                  key={`${link.label}-${link.href}`}
                  href={link.href}
                  className="group flex items-center gap-2 text-sm text-white/40 transition duration-300 hover:text-white"
                >
                  <span className="h-px w-0 bg-amber-400 transition-all duration-300 group-hover:w-3" />

                  <span>{link.label}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Contact */}
          <div className="lg:col-span-4">
            <p className="mb-5 text-[9px] font-bold uppercase tracking-[0.3em] text-amber-400/70">
              Contact
            </p>

            <div className="space-y-4 text-sm">
              {settings.email && (
                <a
                  href={`mailto:${settings.email}`}
                  className="block text-white/40 transition hover:text-white"
                >
                  {settings.email}
                </a>
              )}

              {settings.phone && (
                <a
                  href={`tel:${settings.phone}`}
                  className="block text-white/40 transition hover:text-white"
                >
                  {settings.phone}
                </a>
              )}

              {settings.whatsapp && (
                <a
                  href={`https://wa.me/${String(settings.whatsapp).replace(
                    /[^0-9]/g,
                    ""
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-white/40 transition hover:text-amber-400"
                >
                  WhatsApp
                </a>
              )}

              {!settings.email &&
                !settings.phone &&
                !settings.whatsapp && (
                  <p className="text-white/20">
                    Contact information can be configured from Site Settings.
                  </p>
                )}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col gap-5 border-t border-white/[0.07] py-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[10px] uppercase tracking-[0.12em] text-white/20">
            {settings.footerText ||
              `© ${currentYear} ${siteName}. All rights reserved.`}
          </p>

          <div className="flex items-center gap-5 text-[10px] uppercase tracking-[0.15em] text-white/20">
            <Link
              href="/"
              className="transition hover:text-white/50"
            >
              VÉRANE
            </Link>

            <span className="h-3 w-px bg-white/10" />

            <span>UTHY LUXURY</span>

            <span className="h-3 w-px bg-white/10" />

            <span>ALOMZIEE FOOTIES</span>
          </div>
        </div>
      </div>
    </footer>
  );
}