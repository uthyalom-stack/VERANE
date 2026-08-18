"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const DEFAULT_NAV_ITEMS = [
  { label: "Shop", href: "/catalog" },
  { label: "UTHY LUXURY", href: "/catalog?brand=UTHY_LUXURY" },
  { label: "ALOMZIEE", href: "/catalog?brand=ALOMZIEE_FOOTIES" },
  { label: "Outfit Builder", href: "/outfit-builder" },
  { label: "Cart", href: "/cart" },
];

const DEFAULT_PRIMARY = "#f5b942";

export default function SiteNav() {
  const pathname = usePathname();

  const [settings, setSettings] = useState({});
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  /* -------------------------------------------------------
     LOAD SETTINGS
  ------------------------------------------------------- */

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

  /* -------------------------------------------------------
     CLOSE MOBILE MENU WHEN ROUTE CHANGES
  ------------------------------------------------------- */

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  /* -------------------------------------------------------
     ESCAPE KEY
  ------------------------------------------------------- */

  useEffect(() => {
    if (!menuOpen) return;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  /* -------------------------------------------------------
     PREVENT BODY SCROLL WHEN MOBILE MENU IS OPEN
  ------------------------------------------------------- */

  useEffect(() => {
    if (!menuOpen) return;

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [menuOpen]);

  /* -------------------------------------------------------
     NAVIGATION PARSER
     
     Existing admin format:
     
     Shop:/catalog
     About:/about
     Contact:/contact
  ------------------------------------------------------- */

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

  /* -------------------------------------------------------
     SETTINGS
  ------------------------------------------------------- */

  const customNavItems = useMemo(
    () => parseNavigation(settings.navItems),
    [settings.navItems]
  );

  const navLinks =
    customNavItems.length > 0
      ? customNavItems
      : DEFAULT_NAV_ITEMS;

  const siteName =
    typeof settings.siteName === "string" &&
    settings.siteName.trim()
      ? settings.siteName.trim()
      : "VÉRANE";

  const primaryColor =
    typeof settings.primaryColor === "string" &&
    settings.primaryColor.trim()
      ? settings.primaryColor
      : DEFAULT_PRIMARY;

  const announcementEnabled =
    settings.announcementEnabled === "true" ||
    settings.announcementEnabled === true;

  const announcementText =
    typeof settings.announcementText === "string"
      ? settings.announcementText.trim()
      : "";

  const logo =
    typeof settings.logo === "string"
      ? settings.logo.trim()
      : "";

  /* -------------------------------------------------------
     ACTIVE LINK
  ------------------------------------------------------- */

  function isActive(href) {
    if (!href || typeof href !== "string") {
      return false;
    }

    if (!href.startsWith("/")) {
      return false;
    }

    const cleanHref = href.split("?")[0];

    if (cleanHref === "/") {
      return pathname === "/";
    }

    return (
      pathname === cleanHref ||
      pathname.startsWith(cleanHref + "/")
    );
  }

  /* -------------------------------------------------------
     EXTERNAL LINK DETECTION
  ------------------------------------------------------- */

  function isExternal(href) {
    return (
      href.startsWith("http://") ||
      href.startsWith("https://") ||
      href.startsWith("//")
    );
  }

  /* -------------------------------------------------------
     LINK STYLE HELPERS
  ------------------------------------------------------- */

  function desktopLinkClass(active) {
    return [
      "group",
      "relative",
      "px-4",
      "py-3",
      "text-[10px]",
      "font-bold",
      "uppercase",
      "tracking-[0.16em]",
      "transition-colors",
      "duration-300",
      active
        ? "text-white"
        : "text-white/45 hover:text-white",
    ].join(" ");
  }

  function mobileLinkClass(active) {
    return [
      "flex",
      "items-center",
      "justify-between",
      "rounded-xl",
      "px-4",
      "py-3.5",
      "text-xs",
      "font-bold",
      "uppercase",
      "tracking-[0.15em]",
      "transition",
      active
        ? "text-white"
        : "text-white/55 hover:bg-white/[0.04] hover:text-white",
    ].join(" ");
  }

  /* -------------------------------------------------------
     LOADING BRAND
  ------------------------------------------------------- */

  const brandContent = loading ? (
    <span className="block h-5 w-24 animate-pulse rounded bg-white/10" />
  ) : logo ? (
    <img
      src={logo}
      alt={siteName}
      className="h-10 w-auto max-w-[180px] object-contain transition-opacity duration-300 group-hover:opacity-80"
    />
  ) : (
    <span
      className="text-lg font-black tracking-[-0.04em] transition-opacity duration-300 group-hover:opacity-80 sm:text-xl"
      style={{
        color: primaryColor,
      }}
    >
      {siteName}
    </span>
  );

  return (
    <>
      {/* =====================================================
          ANNOUNCEMENT BAR
      ===================================================== */}

      {announcementEnabled && announcementText && (
        <div
          className="relative z-[60] border-b border-black/10 px-4 py-2.5 text-center text-[9px] font-bold uppercase tracking-[0.18em] text-black sm:text-[10px] sm:tracking-[0.2em]"
          style={{
            backgroundColor: primaryColor,
          }}
        >
          <div className="mx-auto max-w-7xl">
            {announcementText}
          </div>
        </div>
      )}

      {/* =====================================================
          NAVIGATION
      ===================================================== */}

      <nav
        className="sticky top-0 z-50 border-b border-white/[0.07] bg-black/80 backdrop-blur-xl"
        aria-label="Main navigation"
      >
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 sm:px-8">

          {/* BRAND */}
          <Link
            href="/"
            className="group flex shrink-0 items-center"
            aria-label={`${siteName} home`}
          >
            {brandContent}
          </Link>

          {/* DESKTOP NAV */}
          <div className="hidden items-center gap-1 md:flex">
            {navLinks.map((link, index) => {
              const active = isActive(link.href);
              const external = isExternal(link.href);

              if (external) {
                return (
                  <a
                    key={`${link.href}-${index}`}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={desktopLinkClass(false)}
                  >
                    {link.label}

                    <span
                      className="absolute bottom-1 left-4 right-4 h-px opacity-0 transition-all duration-300 group-hover:opacity-100"
                      style={{
                        backgroundColor: primaryColor,
                      }}
                    />
                  </a>
                );
              }

              return (
                <Link
                  key={`${link.href}-${index}`}
                  href={link.href}
                  className={desktopLinkClass(active)}
                >
                  {link.label}

                  <span
                    className={[
                      "absolute",
                      "bottom-1",
                      "left-4",
                      "right-4",
                      "h-px",
                      "transition-all",
                      "duration-300",
                      active
                        ? "opacity-100"
                        : "opacity-0 group-hover:opacity-100",
                    ].join(" ")}
                    style={{
                      backgroundColor: primaryColor,
                    }}
                  />
                </Link>
              );
            })}
          </div>

          {/* MOBILE BUTTON */}
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
            aria-controls="mobile-navigation"
            className="relative flex h-11 w-11 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.025] text-white transition hover:border-white/20 hover:bg-white/[0.06] md:hidden"
          >
            <span className="relative flex h-4 w-5 flex-col justify-between">
              <span
                className={[
                  "h-px",
                  "w-full",
                  "bg-current",
                  "transition-all",
                  "duration-300",
                  menuOpen
                    ? "translate-y-[7px] rotate-45"
                    : "",
                ].join(" ")}
              />

              <span
                className={[
                  "h-px",
                  "w-full",
                  "bg-current",
                  "transition-all",
                  "duration-300",
                  menuOpen
                    ? "opacity-0"
                    : "opacity-100",
                ].join(" ")}
              />

              <span
                className={[
                  "h-px",
                  "w-full",
                  "bg-current",
                  "transition-all",
                  "duration-300",
                  menuOpen
                    ? "-translate-y-[7px] -rotate-45"
                    : "",
                ].join(" ")}
              />
            </span>
          </button>
        </div>

        {/* ===================================================
            MOBILE NAV
        =================================================== */}

        <div
          id="mobile-navigation"
          className={[
            "overflow-hidden",
            "border-t",
            "border-white/[0.06]",
            "transition-all",
            "duration-300",
            "md:hidden",
            menuOpen
              ? "max-h-[calc(100vh-72px)] opacity-100"
              : "max-h-0 opacity-0",
          ].join(" ")}
        >
          <div className="mx-auto max-w-7xl px-5 py-4 sm:px-8">
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-2">

              {navLinks.map((link, index) => {
                const active = isActive(link.href);
                const external = isExternal(link.href);

                const content = (
                  <>
                    <span>{link.label}</span>

                    <span
                      className={[
                        "text-sm",
                        "transition-transform",
                        "duration-300",
                        active
                          ? "translate-x-0"
                          : "translate-x-1 text-white/20",
                      ].join(" ")}
                      style={
                        active
                          ? {
                              color: primaryColor,
                            }
                          : undefined
                      }
                    >
                      {external ? "↗" : "→"}
                    </span>
                  </>
                );

                if (external) {
                  return (
                    <a
                      key={`mobile-${link.href}-${index}`}
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setMenuOpen(false)}
                      className={mobileLinkClass(false)}
                    >
                      {content}
                    </a>
                  );
                }

                return (
                  <Link
                    key={`mobile-${link.href}-${index}`}
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className={mobileLinkClass(active)}
                    style={
                      active
                        ? {
                            backgroundColor:
                              primaryColor + "14",
                          }
                        : undefined
                    }
                  >
                    {content}
                  </Link>
                );
              })}
            </div>

            {/* MOBILE BRAND FOOTER */}
            <div className="flex items-center justify-between px-2 py-5">
              <div>
                <p
                  className="text-[10px] font-black uppercase tracking-[0.25em]"
                  style={{
                    color: primaryColor,
                  }}
                >
                  {siteName}
                </p>

                <p className="mt-1 text-[9px] uppercase tracking-[0.2em] text-white/20">
                  Luxury / Made Different
                </p>
              </div>

              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="text-[10px] uppercase tracking-widest text-white/30 hover:text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* =====================================================
          MOBILE BACKDROP
      ===================================================== */}

      {menuOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          onClick={() => setMenuOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
        />
      )}
    </>
  );
}