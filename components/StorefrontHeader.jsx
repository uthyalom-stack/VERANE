"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

function StorefrontHeaderInner() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [account, setAccount] = useState(null);
  const [settings, setSettings] = useState({});
  const [cartCount, setCartCount] = useState(0);

  // Debounced search logic
  useEffect(() => {
    const term = search.trim();
    if (!term || term.length < 2) {
      setSearchResults([]);
      setSearchLoading(false);
      setSearchError("");
      return;
    }

    setSearchLoading(true);
    setSearchError("");

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/products?search=${encodeURIComponent(term)}&limit=8`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error("Failed to search products");
        }

        const data = await response.json();
        setSearchResults(Array.isArray(data) ? data : []);
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("Search error:", err);
          setSearchError("Unable to load search results.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setSearchLoading(false);
        }
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [search]);

  const brandParam = searchParams?.get("brand") || "";

  useEffect(() => {
    loadSettings();
    loadSession();
    updateCartCount();

    const handleStorage = () => {
      updateCartCount();
    };

    const handleCartUpdate = () => {
      updateCartCount();
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("cart-updated", handleCartUpdate);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("cart-updated", handleCartUpdate);
    };
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    setSearchOpen(false);
  }, [pathname, searchParams]);

  useEffect(() => {
    if (!menuOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [menuOpen]);

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

  async function loadSettings() {
    try {
      const response = await fetch("/api/settings", {
        cache: "no-store",
      });

      if (!response.ok) return;

      const data = await response.json();
      setSettings(data || {});
    } catch (error) {
      console.error("Failed loading settings", error);
    }
  }

  async function loadSession() {
    try {
      const response = await fetch("/api/auth/session", {
        cache: "no-store",
      });

      if (!response.ok) {
        setAccount(null);
        return;
      }

      const data = await response.json();
      setAccount(data?.user || null);
    } catch {
      setAccount(null);
    }
  }

  function updateCartCount() {
    try {
      const cart = JSON.parse(
        localStorage.getItem("cart") || '{"items":[]}'
      );

      const count = Array.isArray(cart.items)
        ? cart.items.reduce(
            (total, item) => total + Number(item.qty || item.quantity || 0),
            0
          )
        : 0;

      setCartCount(count);
    } catch {
      setCartCount(0);
    }
  }

  function handleSearchSubmit(event) {
    event.preventDefault();

    const value = search.trim();
    if (!value) return;

    setSearchOpen(false);
    setMenuOpen(false);

    router.push(`/catalog?search=${encodeURIComponent(value)}`);
  }

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      });
    } catch {}

    setAccount(null);
    setMenuOpen(false);

    router.push("/");
    router.refresh();
  }

  function closeMenu() {
    setMenuOpen(false);
  }

  /* -------------------------------------------------------
     ACTIVE STATE DETECTION LOGIC
  ------------------------------------------------------- */

  function isHomeActive() {
    return pathname === "/";
  }

  function isShopActive() {
    if (pathname === "/catalog") {
      return !brandParam;
    }
    return false;
  }

  function isOutfitActive() {
    return pathname?.startsWith("/outfit-builder");
  }

  function isAlomzieeActive() {
    return (
      pathname?.includes("ALOMZIEE_FOOTIES") ||
      pathname === "/alomziee" ||
      brandParam === "ALOMZIEE_FOOTIES"
    );
  }

  function isUthyActive() {
    return (
      pathname?.includes("UTHY_LUXURY") ||
      pathname === "/uthy" ||
      brandParam === "UTHY_LUXURY"
    );
  }

  function isAccountActive() {
    return (
      pathname?.startsWith("/account") ||
      pathname?.startsWith("/orders") ||
      pathname?.startsWith("/login") ||
      pathname?.startsWith("/join") ||
      pathname?.startsWith("/welcome")
    );
  }

  const primaryColor = settings.primaryColor || "#f5b942";

  return (
    <>
      {/* =====================================================
          ANNOUNCEMENT BAR
      ===================================================== */}

      {settings.announcementEnabled === "true" && settings.announcementText && (
        <div
          className="text-black text-[9px] sm:text-[10px] uppercase tracking-[0.25em] text-center py-2.5 px-4 font-semibold z-[60] relative"
          style={{
            backgroundColor: primaryColor,
          }}
        >
          {settings.announcementText}
        </div>
      )}

      {/* =====================================================
          MAIN HEADER (Top Header across Desktop & Mobile)
      ===================================================== */}

      <header className="sticky top-0 z-50 bg-black/90 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-10">
          <div className="h-[70px] sm:h-[76px] flex items-center justify-between gap-4">

            {/* =================================================
                MOBILE TOP HEADER LEFT: HAMBURGER
            ================================================= */}

            <div className="flex items-center gap-2 lg:hidden flex-1">
              <button
                type="button"
                onClick={() => setMenuOpen((current) => !current)}
                className="w-10 h-10 flex items-center justify-center text-white rounded-full border border-white/10 bg-white/[0.03] active:bg-white/10 transition"
                aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
                aria-expanded={menuOpen}
              >
                <div className="relative w-5 h-5 flex items-center justify-center">
                  <span
                    className={`absolute block w-5 h-0.5 bg-white transition-all duration-300 ${
                      menuOpen ? "rotate-45" : "-translate-y-[5px]"
                    }`}
                  />
                  <span
                    className={`absolute block w-5 h-0.5 bg-white transition-all duration-300 ${
                      menuOpen ? "opacity-0" : "opacity-100"
                    }`}
                  />
                  <span
                    className={`absolute block w-5 h-0.5 bg-white transition-all duration-300 ${
                      menuOpen ? "-rotate-45" : "translate-y-[5px]"
                    }`}
                  />
                </div>
              </button>
            </div>

            {/* =================================================
                DESKTOP LEFT NAVIGATION
            ================================================= */}

            <nav className="hidden lg:flex items-center gap-7 flex-1">
              <Link
                href="/"
                className={`text-[10px] uppercase tracking-[0.2em] font-semibold transition ${
                  isHomeActive() ? "text-white" : "text-neutral-400 hover:text-white"
                }`}
              >
                Home
              </Link>

              <Link
                href="/catalog"
                className={`text-[10px] uppercase tracking-[0.2em] font-semibold transition ${
                  isShopActive() ? "text-white" : "text-neutral-400 hover:text-white"
                }`}
              >
                Shop
              </Link>

              <Link
                href="/storefront/UTHY_LUXURY"
                className={`text-[10px] uppercase tracking-[0.2em] font-semibold transition ${
                  isUthyActive() ? "text-white" : "text-neutral-400 hover:text-white"
                }`}
              >
                {settings.uthyName || "UTHY Luxury"}
              </Link>

              <Link
                href="/storefront/ALOMZIEE_FOOTIES"
                className={`text-[10px] uppercase tracking-[0.2em] font-semibold transition ${
                  isAlomzieeActive() ? "text-white" : "text-neutral-400 hover:text-white"
                }`}
              >
                {settings.alomzieeName || "Alomziee Footies"}
              </Link>

              <Link
                href="/outfit-builder"
                prefetch={false}
                className={`text-[10px] uppercase tracking-[0.2em] font-semibold transition ${
                  isOutfitActive() ? "text-white" : "text-neutral-400 hover:text-white"
                }`}
              >
                Outfit Builder
              </Link>
            </nav>

            {/* =================================================
                CENTER BRAND / LOGO (Mobile & Desktop)
            ================================================= */}

            <Link
              href="/"
              className="flex flex-col items-center justify-center text-center group py-1"
              onClick={closeMenu}
            >
              {settings.logo ? (
                <img
                  src={settings.logo}
                  alt={settings.siteName || "VÉRANE"}
                  className="h-7 sm:h-9 w-auto max-w-[160px] object-contain transition-opacity group-hover:opacity-85"
                />
              ) : (
                <span
                  className="text-lg sm:text-2xl font-black tracking-[0.22em] transition-opacity group-hover:opacity-85"
                  style={{
                    color: settings.primaryColor || "#ffffff",
                  }}
                >
                  {settings.siteName || "VÉRANE"}
                </span>
              )}

              <span className="hidden sm:block text-[7px] text-neutral-500 tracking-[0.35em] uppercase mt-0.5">
                {settings.tagline || "Two Brands. One Expression."}
              </span>
            </Link>

            {/* =================================================
                RIGHT ACTIONS (Search, Account, Cart)
            ================================================= */}

            <div className="flex items-center justify-end gap-1 sm:gap-2 flex-1">

              {/* SEARCH */}
              <button
                type="button"
                onClick={() => setSearchOpen((current) => !current)}
                className="w-10 h-10 flex items-center justify-center text-neutral-300 hover:text-white transition rounded-full hover:bg-white/[0.05]"
                aria-label="Search across both brands"
                title="Search"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <circle cx="11" cy="11" r="7" strokeWidth="1.5" />
                  <path d="m20 20-4-4" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>

              {/* ACCOUNT (Desktop) */}
              <Link
                href="/account"
                className={`hidden lg:flex w-10 h-10 items-center justify-center transition relative rounded-full hover:bg-white/[0.05] ${
                  isAccountActive() ? "text-white" : "text-neutral-300 hover:text-white"
                }`}
                aria-label="Account"
                title="Account"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <circle cx="12" cy="8" r="4" strokeWidth="1.5" />
                  <path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" strokeWidth="1.5" strokeLinecap="round" />
                </svg>

                {account && (
                  <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-amber-400" />
                )}
              </Link>

              {/* CART */}
              <Link
                href="/cart"
                className="w-10 h-10 flex items-center justify-center text-neutral-300 hover:text-white transition relative rounded-full hover:bg-white/[0.05]"
                aria-label="Shopping bag"
                title="Cart"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M6 8h12l1 13H5L6 8Z" strokeWidth="1.5" strokeLinejoin="round" />
                  <path d="M9 8V6a3 3 0 0 1 6 0v2" strokeWidth="1.5" strokeLinecap="round" />
                </svg>

                {cartCount > 0 && (
                  <span
                    className="absolute top-1 right-0 min-w-[16px] h-4 px-1 rounded-full text-black text-[8px] font-bold flex items-center justify-center"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {cartCount > 99 ? "99+" : cartCount}
                  </span>
                )}
              </Link>

            </div>
          </div>

          {/* =====================================================
              TOP SEARCH PANEL & REAL-TIME AUTOCOMPLETE DROPDOWN
          ===================================================== */}

          {searchOpen && (
            <div className="border-t border-white/10 py-3.5 animate-in slide-in-from-top-2 duration-200 relative">
              <form onSubmit={handleSearchSubmit} className="flex items-center gap-3 max-w-3xl mx-auto">
                <div className="relative flex-1">
                  <input
                    autoFocus
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search UTHY LUXURY and ALOMZIEE FOOTIES..."
                    className="w-full bg-neutral-950 border border-white/15 rounded-full pl-5 pr-10 py-2.5 text-xs text-white placeholder:text-neutral-500 outline-none focus:border-amber-400/80 transition"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-full text-[10px] font-bold uppercase tracking-[0.15em] text-black transition hover:opacity-90 shrink-0"
                  style={{ backgroundColor: primaryColor }}
                >
                  Search
                </button>
              </form>

              {/* LIVE AUTOCOMPLETE DROPDOWN RESULTS */}
              {search.trim().length >= 2 && (
                <div className="mt-3 max-w-3xl mx-auto rounded-2xl border border-white/10 bg-neutral-950/95 backdrop-blur-2xl p-4 shadow-2xl space-y-3 z-50">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2 px-1">
                    <p className="text-[9px] font-mono uppercase tracking-[0.25em] text-amber-400 font-bold">
                      LIVE RESULTS FOR &ldquo;{search.trim()}&rdquo;
                    </p>
                    <span className="text-[9px] font-mono uppercase tracking-wider text-neutral-500">
                      BOTH BRANDS
                    </span>
                  </div>

                  {searchLoading ? (
                    <div className="py-6 space-y-2">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-3 p-2 rounded-xl bg-white/[0.02]">
                          <div className="w-10 h-12 rounded-lg bg-neutral-900 animate-pulse shrink-0" />
                          <div className="space-y-1 flex-1">
                            <div className="h-3 w-1/3 rounded bg-neutral-900 animate-pulse" />
                            <div className="h-4 w-1/2 rounded bg-neutral-900 animate-pulse" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : searchError ? (
                    <p className="py-4 text-center text-xs text-red-400 font-mono">
                      {searchError}
                    </p>
                  ) : searchResults.length === 0 ? (
                    <p className="py-6 text-center text-xs text-neutral-500 font-mono">
                      No products found for &ldquo;{search.trim()}&rdquo;.
                    </p>
                  ) : (
                    <div className="space-y-1 max-h-[380px] overflow-y-auto pr-1">
                      {searchResults.map((prod) => {
                        let img = null;
                        try {
                          if (Array.isArray(prod.images)) img = prod.images[0];
                          else if (typeof prod.images === "string") {
                            const parsed = JSON.parse(prod.images);
                            if (Array.isArray(parsed)) img = parsed[0];
                            else img = prod.images;
                          }
                        } catch {
                          img = prod.images;
                        }

                        const brandName =
                          prod.brand === "UTHY_LUXURY"
                            ? "UTHY LUXURY"
                            : prod.brand === "ALOMZIEE_FOOTIES"
                            ? "ALOMZIEE FOOTIES"
                            : prod.brand || "VÉRANE";

                        return (
                          <Link
                            key={prod.id}
                            href={`/product/${prod.id}`}
                            onClick={() => {
                              setSearchOpen(false);
                              setSearch("");
                            }}
                            className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/[0.06] transition group"
                          >
                            <div className="w-10 h-12 rounded-lg bg-neutral-900 overflow-hidden shrink-0 border border-white/5">
                              {img ? (
                                <img
                                  src={img}
                                  alt={prod.name}
                                  className="w-full h-full object-cover group-hover:scale-105 transition"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-[10px] text-neutral-600 font-mono">
                                  V
                                </div>
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-amber-400 truncate">
                                {brandName} {prod.category ? `• ${prod.category}` : ""}
                              </p>
                              <p className="text-xs font-semibold text-white truncate mt-0.5 group-hover:text-amber-300 transition">
                                {prod.name}
                              </p>
                            </div>

                            <div className="text-right shrink-0">
                              <p className="text-xs font-bold font-mono text-white">
                                ₦{Number(prod.price || 0).toLocaleString("en-NG")}
                              </p>
                            </div>
                          </Link>
                        );
                      })}

                      <div className="pt-2 border-t border-white/10 text-center">
                        <button
                          type="button"
                          onClick={handleSearchSubmit}
                          className="text-[10px] font-mono uppercase tracking-[0.2em] text-amber-400 hover:text-amber-300 transition py-1"
                        >
                          View all matching results →
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* =====================================================
              MOBILE SECONDARY HAMBURGER DRAWER MENU
          ===================================================== */}

          {menuOpen && (
            <div className="lg:hidden border-t border-white/10 py-6 max-h-[calc(100vh-80px)] overflow-y-auto">
              <div className="space-y-6 px-2">

                {/* DISCOVER */}
                <div>
                  <p className="px-3 text-[9px] font-bold uppercase tracking-[0.25em] text-amber-400 mb-2">
                    DISCOVER
                  </p>
                  <nav className="flex flex-col gap-0.5">
                    <Link
                      href="/about"
                      onClick={closeMenu}
                      className="px-3 py-2.5 text-xs uppercase tracking-[0.18em] text-neutral-300 hover:text-white hover:bg-white/[0.04] rounded-lg transition"
                    >
                      About VÉRANE
                    </Link>
                    <Link
                      href="/about#story"
                      onClick={closeMenu}
                      className="px-3 py-2.5 text-xs uppercase tracking-[0.18em] text-neutral-300 hover:text-white hover:bg-white/[0.04] rounded-lg transition"
                    >
                      Our Story
                    </Link>
                  </nav>
                </div>

                {/* BRANDS */}
                <div>
                  <p className="px-3 text-[9px] font-bold uppercase tracking-[0.25em] text-amber-400 mb-2">
                    BRANDS
                  </p>
                  <nav className="flex flex-col gap-0.5">
                    <Link
                      href="/storefront/ALOMZIEE_FOOTIES"
                      onClick={closeMenu}
                      className="px-3 py-2.5 text-xs uppercase tracking-[0.18em] text-neutral-300 hover:text-white hover:bg-white/[0.04] rounded-lg transition flex items-center justify-between"
                    >
                      <span>{settings.alomzieeName || "ALOMZIEE FOOTIES"}</span>
                      {settings.alomzieeLogo && (
                        <img src={settings.alomzieeLogo} alt="" className="h-4 w-auto object-contain" />
                      )}
                    </Link>

                    <Link
                      href="/storefront/UTHY_LUXURY"
                      onClick={closeMenu}
                      className="px-3 py-2.5 text-xs uppercase tracking-[0.18em] text-neutral-300 hover:text-white hover:bg-white/[0.04] rounded-lg transition flex items-center justify-between"
                    >
                      <span>{settings.uthyName || "UTHY LUXURY"}</span>
                      {settings.uthyLogo && (
                        <img src={settings.uthyLogo} alt="" className="h-4 w-auto object-contain" />
                      )}
                    </Link>
                  </nav>
                </div>

                {/* CUSTOMER CARE */}
                <div>
                  <p className="px-3 text-[9px] font-bold uppercase tracking-[0.25em] text-amber-400 mb-2">
                    CUSTOMER CARE
                  </p>
                  <nav className="flex flex-col gap-0.5">
                    <Link
                      href="/contact"
                      onClick={closeMenu}
                      className="px-3 py-2.5 text-xs uppercase tracking-[0.18em] text-neutral-300 hover:text-white hover:bg-white/[0.04] rounded-lg transition"
                    >
                      Contact
                    </Link>
                    <Link
                      href="/faq"
                      onClick={closeMenu}
                      className="px-3 py-2.5 text-xs uppercase tracking-[0.18em] text-neutral-300 hover:text-white hover:bg-white/[0.04] rounded-lg transition"
                    >
                      FAQ
                    </Link>
                    <Link
                      href="/contact"
                      onClick={closeMenu}
                      className="px-3 py-2.5 text-xs uppercase tracking-[0.18em] text-neutral-300 hover:text-white hover:bg-white/[0.04] rounded-lg transition"
                    >
                      Shipping & Delivery
                    </Link>
                    <Link
                      href="/faq"
                      onClick={closeMenu}
                      className="px-3 py-2.5 text-xs uppercase tracking-[0.18em] text-neutral-300 hover:text-white hover:bg-white/[0.04] rounded-lg transition"
                    >
                      Returns Policy
                    </Link>
                  </nav>
                </div>

                {/* INFORMATION */}
                <div>
                  <p className="px-3 text-[9px] font-bold uppercase tracking-[0.25em] text-amber-400 mb-2">
                    INFORMATION
                  </p>
                  <nav className="flex flex-col gap-0.5">
                    <Link
                      href="/faq"
                      onClick={closeMenu}
                      className="px-3 py-2.5 text-xs uppercase tracking-[0.18em] text-neutral-300 hover:text-white hover:bg-white/[0.04] rounded-lg transition"
                    >
                      Privacy Policy
                    </Link>
                    <Link
                      href="/faq"
                      onClick={closeMenu}
                      className="px-3 py-2.5 text-xs uppercase tracking-[0.18em] text-neutral-300 hover:text-white hover:bg-white/[0.04] rounded-lg transition"
                    >
                      Terms & Conditions
                    </Link>
                  </nav>
                </div>

                {/* ACCOUNT */}
                <div className="pt-2 border-t border-white/10">
                  <p className="px-3 text-[9px] font-bold uppercase tracking-[0.25em] text-amber-400 mb-2">
                    ACCOUNT
                  </p>
                  <nav className="flex flex-col gap-0.5">
                    {account ? (
                      <>
                        <Link
                          href="/account"
                          onClick={closeMenu}
                          className="px-3 py-2.5 text-xs uppercase tracking-[0.18em] text-neutral-300 hover:text-white hover:bg-white/[0.04] rounded-lg transition"
                        >
                          My Account ({account.name || account.email})
                        </Link>
                        <Link
                          href="/orders"
                          onClick={closeMenu}
                          className="px-3 py-2.5 text-xs uppercase tracking-[0.18em] text-neutral-300 hover:text-white hover:bg-white/[0.04] rounded-lg transition"
                        >
                          Order History
                        </Link>
                        <button
                          type="button"
                          onClick={handleLogout}
                          className="text-left px-3 py-2.5 text-xs uppercase tracking-[0.18em] text-rose-400 hover:text-rose-300 hover:bg-white/[0.04] rounded-lg transition w-full"
                        >
                          Sign Out
                        </button>
                      </>
                    ) : (
                      <>
                        <Link
                          href="/login"
                          onClick={closeMenu}
                          className="px-3 py-2.5 text-xs uppercase tracking-[0.18em] text-neutral-300 hover:text-white hover:bg-white/[0.04] rounded-lg transition"
                        >
                          Sign In
                        </Link>
                        <Link
                          href="/join"
                          onClick={closeMenu}
                          className="px-3 py-2.5 text-xs uppercase tracking-[0.18em] text-neutral-300 hover:text-white hover:bg-white/[0.04] rounded-lg transition"
                        >
                          Create Account
                        </Link>
                      </>
                    )}
                  </nav>
                </div>

              </div>

              {/* DRAWER FOOTER */}
              <div className="mt-8 pt-4 px-3 border-t border-white/10 flex items-center justify-between">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.3em]" style={{ color: primaryColor }}>
                    {settings.siteName || "VÉRANE"}
                  </p>
                  <p className="mt-0.5 text-[8px] uppercase tracking-[0.2em] text-neutral-500">
                    {settings.tagline || "Two Brands. One Expression."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeMenu}
                  className="text-[9px] uppercase tracking-[0.2em] text-neutral-400 hover:text-white"
                >
                  Close
                </button>
              </div>

            </div>
          )}

        </div>
      </header>

      {/* =====================================================
          PERSISTENT MOBILE FIXED BOTTOM NAVIGATION BAR
      ===================================================== */}

      <nav
        className="fixed bottom-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-xl border-t border-white/10 md:hidden px-1 py-1.5"
        aria-label="Mobile Bottom Navigation"
      >
        <div className="grid grid-cols-6 items-center justify-items-center max-w-md mx-auto">

          {/* 1. HOME */}
          <Link
            href="/"
            onClick={closeMenu}
            className={`flex flex-col items-center justify-center py-1 px-1 w-full text-center transition ${
              isHomeActive() ? "text-amber-400" : "text-neutral-400 hover:text-white"
            }`}
          >
            <svg className="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-[8px] font-bold uppercase tracking-wider scale-90">Home</span>
          </Link>

          {/* 2. SHOP */}
          <Link
            href="/catalog"
            onClick={closeMenu}
            className={`flex flex-col items-center justify-center py-1 px-1 w-full text-center transition ${
              isShopActive() ? "text-amber-400" : "text-neutral-400 hover:text-white"
            }`}
          >
            <svg className="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-[8px] font-bold uppercase tracking-wider scale-90">Shop</span>
          </Link>

          {/* 3. OUTFIT (✦ Outfit Builder) */}
          <Link
            href="/outfit-builder"
            prefetch={false}
            onClick={closeMenu}
            className={`flex flex-col items-center justify-center py-1 px-1 w-full text-center transition ${
              isOutfitActive() ? "text-amber-400" : "text-neutral-400 hover:text-white"
            }`}
          >
            <div className="relative mb-0.5">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="5" r="2.5" strokeWidth="1.5" />
                <path d="M8.5 21v-6.5L6 11l3-4 3 2 3-2 3 4-2.5 3.5V21" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M9 21h6" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <span className="absolute -top-1 -right-1.5 text-[8px] text-amber-400 leading-none">✦</span>
            </div>
            <span className="text-[8px] font-bold uppercase tracking-wider scale-90">Outfit</span>
          </Link>

          {/* 4. ALOMZIEE */}
          <Link
            href="/storefront/ALOMZIEE_FOOTIES"
            onClick={closeMenu}
            className={`flex flex-col items-center justify-center py-1 px-1 w-full text-center transition ${
              isAlomzieeActive() ? "text-amber-400" : "text-neutral-400 hover:text-white"
            }`}
          >
            {settings.alomzieeLogo ? (
              <img
                src={settings.alomzieeLogo}
                alt="ALOMZIEE"
                className={`h-4 w-auto max-w-[32px] object-contain mb-0.5 ${
                  isAlomzieeActive() ? "brightness-125" : "opacity-75"
                }`}
              />
            ) : (
              <span className="text-[10px] font-black tracking-tighter mb-0.5 leading-none">AZ</span>
            )}
            <span className="text-[8px] font-bold uppercase tracking-wider scale-90 truncate max-w-full">ALOMZIEE</span>
          </Link>

          {/* 5. UTHY */}
          <Link
            href="/storefront/UTHY_LUXURY"
            onClick={closeMenu}
            className={`flex flex-col items-center justify-center py-1 px-1 w-full text-center transition ${
              isUthyActive() ? "text-amber-400" : "text-neutral-400 hover:text-white"
            }`}
          >
            {settings.uthyLogo ? (
              <img
                src={settings.uthyLogo}
                alt="UTHY"
                className={`h-4 w-auto max-w-[32px] object-contain mb-0.5 ${
                  isUthyActive() ? "brightness-125" : "opacity-75"
                }`}
              />
            ) : (
              <span className="text-[10px] font-black tracking-tighter mb-0.5 leading-none">UX</span>
            )}
            <span className="text-[8px] font-bold uppercase tracking-wider scale-90 truncate max-w-full">UTHY</span>
          </Link>

          {/* 6. ACCOUNT */}
          <Link
            href="/account"
            onClick={closeMenu}
            className={`flex flex-col items-center justify-center py-1 px-1 w-full text-center transition relative ${
              isAccountActive() ? "text-amber-400" : "text-neutral-400 hover:text-white"
            }`}
          >
            <div className="relative mb-0.5">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="8" r="4" strokeWidth="1.5" />
                <path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              {account && (
                <span className="absolute top-0 right-0 w-1.5 h-1.5 rounded-full bg-emerald-400" />
              )}
            </div>
            <span className="text-[8px] font-bold uppercase tracking-wider scale-90">Account</span>
          </Link>

        </div>
      </nav>
    </>
  );
}

export default function StorefrontHeader() {
  return (
    <Suspense fallback={<div className="h-[70px] bg-black/90 border-b border-white/10" />}>
      <StorefrontHeaderInner />
    </Suspense>
  );
}
