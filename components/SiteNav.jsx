"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const DEFAULT_NAV_ITEMS = [
  {
    label: "Shop",
    href: "/catalog",
  },
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
  {
    label: "Cart",
    href: "/cart",
  },
];

export default function SiteNav() {
  const pathname = usePathname();

  const [settings, setSettings] = useState({});
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadSettings() {
      try {
        const response = await fetch("/api/settings", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Failed to load settings");
        }

        const data = await response.json();

        if (mounted) {
          setSettings(data || {});
        }
      } catch (error) {
        console.error("Failed to load site settings:", error);

        if (mounted) {
          setSettings({});
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadSettings();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  function parseNavigation(value) {
    if (!value || typeof value !== "string") {
      return [];
    }

    return value
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const separatorIndex = line.indexOf(":");

        if (separatorIndex === -1) {
          return null;
        }

        const label = line
          .slice(0, separatorIndex)
          .trim();

        const href = line
          .slice(separatorIndex + 1)
          .trim();

        if (!label || !href) {
          return null;
        }

        return {
          label,
          href,
        };
      })
      .filter(Boolean);
  }

  const customNavItems = parseNavigation(
    settings.navItems
  );

  const navLinks =
    customNavItems.length > 0
      ? customNavItems
      : DEFAULT_NAV_ITEMS;

  const announcementEnabled =
    settings.announcementEnabled === "true";

  const announcementText =
    settings.announcementText?.trim();

  const siteName =
    settings.siteName?.trim() || "VÉRANE";

  function isActive(href) {
    if (!href || !href.startsWith("/")) {
      return false;
    }

    const cleanHref = href.split("?")[0];

    if (cleanHref === "/") {
      return pathname === "/";
    }

    return (
      pathname === cleanHref ||
      pathname.startsWith(`${cleanHref}/`)
    );
  }

  return (
    <>
      {/* ANNOUNCEMENT BAR */}
      {announcementEnabled && announcementText && (
        <div className="relative z-[60] border-b border-black/10 bg-amber-400 px-4 py-2.5 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-black">
          {announcementText}
        </div>
      )}

      {/* NAVIGATION */}
      <nav className="sticky top-0 z-50 border-b border-white/[0.07] bg-black/80 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 sm:px-8">

          {/* LOGO / BRAND */}
          <Link
            href="/"
            className="group flex shrink-0 items-center"
            aria-label={`${siteName} home`}
          >
            {settings.logo ? (
              <img
                src={settings.logo}
                alt={siteName}
                className="h-10 w-auto object-contain transition-opacity duration-300 group-hover:opacity-80"
              />
            ) : (
              <span className="text-lg font-black tracking-[-0.04em] text-amber-400 transition-colors duration-300 group-hover:text-amber-300 sm:text-xl">
                {siteName}
              </span>
            )}
          </Link>

          {/* DESKTOP NAV */}
          <div className="hidden items-center gap-1 md:flex">
            {navLinks.map((link, index) => {
              const active = isActive(link.href);

              return (
                <Link
                  key={`${link.href}-${index}`}
                  href={link.href}
                  className={`group relative px-4 py-3 text-[10px] font-bold uppercase tracking-[0.16em] transition-colors duration-300 ${
                    active
                      ? "text-white"
                      : "text-white/45 hover:text-white"
                  }`}
                >
                  {link.label}

                  <span
                    className={`absolute bottom-1 left-4 right-4 h-px bg-amber-400 transition-all duration-300 ${
                      active
                        ? "opacity-100"
                        : "opacity-0 group-hover:opacity-100"
                    }`}
                  />
                </Link>
              );
            })}
          </div>

          {/* MOBILE MENU BUTTON */}
          <button
            type="button"
            onClick={() =>
              setMenuOpen((current) => !current)
            }
            aria-label={
              menuOpen
                ? "Close navigation menu"
                : "Open navigation menu"
            }
            aria-expanded={menuOpen}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.025] text-white transition hover:border-white/20 hover:bg-white/[0.06] md:hidden"
          >
            <span className="relative flex h-4 w-5 flex-col justify-between">
              <span
                className={`h-px w-full bg-current transition-all duration-300 ${
                  menuOpen
                    ? "translate-y-[7px] rotate-45"
                    : ""
                }`}
              />

              <span
                className={`h-px w-full bg-current transition-all duration-300 ${
                  menuOpen
                    ? "opacity-0"
                    : "opacity-100"
                }`}
              />

              <span
                className={`h-px w-full bg-current transition-all duration-300 ${
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
          className={`overflow-hidden border-t border-white/[0.06] transition-all duration-300 md:hidden ${
            menuOpen
              ? "max-h-[500px] opacity-100"
              : "max-h-0 opacity-0"
          }`}
        >
          <div className="mx-auto max-w-7xl px-5 py-4 sm:px-8">
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-2">
              {navLinks.map((link, index) => {
                const active = isActive(link.href);

                return (
                  <Link
                    key={`mobile-${link.href}-${index}`}
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className={`flex items-center justify-between rounded-xl px-4 py-3.5 text-xs font-bold uppercase tracking-[0.15em] transition ${
                      active
                        ? "bg-amber-400/[0.08] text-amber-400"
                        : "text-white/55 hover:bg-white/[0.04] hover:text-white"
                    }`}
                  >
                    <span>{link.label}</span>

                    <span
                      className={`text-sm transition-transform duration-300 ${
                        active
                          ? "translate-x-0 text-amber-400"
                          : "text-white/20"
                      }`}
                    >
                      →
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}