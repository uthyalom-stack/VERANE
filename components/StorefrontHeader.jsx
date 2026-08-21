"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export default function StorefrontHeader() {
  const pathname = usePathname();
  const router = useRouter();

  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [account, setAccount] = useState(null);
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
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
  }, [pathname]);

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
            (total, item) => total + Number(item.qty || 0),
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

    router.push(
      `/catalog?search=${encodeURIComponent(value)}`
    );
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

  function isActive(href) {
    if (!href) return false;

    const cleanHref = href.split("?")[0];

    if (cleanHref === "/") {
      return pathname === "/";
    }

    return (
      pathname === cleanHref ||
      pathname?.startsWith(cleanHref + "/")
    );
  }

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <>
      {/* =====================================================
          ANNOUNCEMENT BAR
      ===================================================== */}

      <div className="bg-white text-black text-[9px] sm:text-[10px] uppercase tracking-[0.25em] text-center py-2.5 px-4 font-semibold">
        Complimentary delivery on qualifying orders
      </div>

      {/* =====================================================
          MAIN HEADER
      ===================================================== */}

      <header className="sticky top-0 z-50 bg-black/90 backdrop-blur-xl border-b border-white/10">

        <div className="max-w-[1600px] mx-auto px-5 sm:px-8 lg:px-10">

          <div className="h-[76px] flex items-center justify-between gap-6">

            {/* =================================================
                MOBILE HAMBURGER
            ================================================= */}

            <button
              type="button"
              onClick={() =>
                setMenuOpen((current) => !current)
              }
              className="lg:hidden w-10 h-10 flex items-center justify-center text-white"
              aria-label={
                menuOpen
                  ? "Close navigation menu"
                  : "Open navigation menu"
              }
              aria-expanded={menuOpen}
            >
              <div className="relative w-5 h-5 flex items-center justify-center">

                <span
                  className={`absolute block w-5 h-px bg-white transition-all duration-300 ${
                    menuOpen
                      ? "rotate-45"
                      : "-translate-y-[4px]"
                  }`}
                />

                <span
                  className={`absolute block w-5 h-px bg-white transition-all duration-300 ${
                    menuOpen
                      ? "-rotate-45"
                      : "translate-y-[4px]"
                  }`}
                />

              </div>
            </button>

            {/* =================================================
                DESKTOP NAVIGATION
            ================================================= */}

            <nav className="hidden lg:flex items-center gap-8 flex-1">

              <Link
                href="/catalog"
                className={`text-[10px] uppercase tracking-[0.2em] transition ${
                  isActive("/catalog")
                    ? "text-white"
                    : "text-neutral-500 hover:text-white"
                }`}
              >
                Shop
              </Link>

              <Link
                href="/catalog?brand=UTHY_LUXURY"
                className={`text-[10px] uppercase tracking-[0.2em] transition ${
                  pathname?.includes("UTHY_LUXURY")
                    ? "text-white"
                    : "text-neutral-500 hover:text-white"
                }`}
              >
                UTHY Luxury
              </Link>

              <Link
                href="/catalog?brand=ALOMZIEE_FOOTIES"
                className={`text-[10px] uppercase tracking-[0.2em] transition ${
                  pathname?.includes("ALOMZIEE_FOOTIES")
                    ? "text-white"
                    : "text-neutral-500 hover:text-white"
                }`}
              >
                Alomziee Footies
              </Link>

              <Link
                href="/outfit-builder"
                className={`text-[10px] uppercase tracking-[0.2em] transition ${
                  isActive("/outfit-builder")
                    ? "text-white"
                    : "text-neutral-500 hover:text-white"
                }`}
              >
                Studio
              </Link>

            </nav>

            {/* =================================================
                CENTER BRAND
            ================================================= */}

            <Link
              href="/"
              className="absolute left-1/2 -translate-x-1/2 text-center"
              onClick={closeMenu}
            >
              <div className="text-xl sm:text-2xl font-black tracking-[0.22em] text-white">
                VÉRANE
              </div>

              <div className="hidden sm:block text-[7px] text-neutral-500 tracking-[0.35em] uppercase mt-1">
                Two brands. One expression.
              </div>
            </Link>

            {/* =================================================
                RIGHT ACTIONS
            ================================================= */}

            <div className="flex items-center justify-end gap-1 sm:gap-2 flex-1">

              {/* SEARCH */}

              <button
                type="button"
                onClick={() =>
                  setSearchOpen((current) => !current)
                }
                className="w-10 h-10 flex items-center justify-center text-neutral-400 hover:text-white transition"
                aria-label="Search"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <circle
                    cx="11"
                    cy="11"
                    r="7"
                    strokeWidth="1.5"
                  />

                  <path
                    d="m20 20-4-4"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </button>

              {/* ACCOUNT */}

              <Link
                href="/account"
                className="hidden sm:flex w-10 h-10 items-center justify-center text-neutral-400 hover:text-white transition relative"
                aria-label="Account"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <circle
                    cx="12"
                    cy="8"
                    r="4"
                    strokeWidth="1.5"
                  />

                  <path
                    d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>

                {account && (
                  <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-emerald-400" />
                )}
              </Link>

              {/* CART */}

              <Link
                href="/cart"
                className="w-10 h-10 flex items-center justify-center text-neutral-400 hover:text-white transition relative"
                aria-label="Shopping bag"
                title="Cart"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M6 8h12l1 13H5L6 8Z"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  />

                  <path
                    d="M9 8V6a3 3 0 0 1 6 0v2"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>

                {cartCount > 0 && (
                  <span className="absolute top-1 right-0 min-w-[16px] h-4 px-1 rounded-full bg-white text-black text-[8px] font-bold flex items-center justify-center">
                    {cartCount > 99 ? "99+" : cartCount}
                  </span>
                )}
              </Link>

              {/* =================================================
                  OUTFIT BUILDER BODY ICON
              ================================================= */}

              <Link
                href="/outfit-builder"
                className={`w-10 h-10 flex items-center justify-center transition ${
                  isActive("/outfit-builder")
                    ? "text-white"
                    : "text-neutral-400 hover:text-white"
                }`}
                aria-label="Outfit Builder"
                title="Outfit Builder"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <circle
                    cx="12"
                    cy="5"
                    r="2.5"
                    strokeWidth="1.5"
                  />

                  <path
                    d="M8.5 21v-6.5L6 11l3-4 3 2 3-2 3 4-2.5 3.5V21"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  <path
                    d="M9 21h6"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </Link>

            </div>
          </div>

          {/* =====================================================
              SEARCH PANEL
          ===================================================== */}

          {searchOpen && (
            <div className="border-t border-white/10 py-4">

              <form
                onSubmit={handleSearchSubmit}
                className="flex items-center gap-3"
              >

                <input
                  autoFocus
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Search products..."
                  className="flex-1 bg-neutral-950 border border-white/10 rounded-full px-5 py-3 text-sm text-white placeholder:text-neutral-600 outline-none focus:border-white/30"
                />

                <button
                  type="submit"
                  className="px-6 py-3 rounded-full bg-white text-black text-[10px] font-bold uppercase tracking-[0.15em]"
                >
                  Search
                </button>

              </form>
            </div>
          )}

          {/* =====================================================
              MOBILE MENU
          ===================================================== */}

          {menuOpen && (
            <div className="lg:hidden border-t border-white/10 py-6">

              <nav className="flex flex-col gap-1">

                {/* SHOP */}

                <Link
                  href="/catalog"
                  onClick={closeMenu}
                  className="px-4 py-4 text-xs uppercase tracking-[0.2em] text-white border-b border-white/5"
                >
                  Shop
                </Link>

                {/* UTHY */}

                <Link
                  href="/catalog?brand=UTHY_LUXURY"
                  onClick={closeMenu}
                  className="px-4 py-4 text-xs uppercase tracking-[0.2em] text-neutral-400 hover:text-white border-b border-white/5"
                >
                  UTHY Luxury
                </Link>

                {/* ALOMZIEE */}

                <Link
                  href="/catalog?brand=ALOMZIEE_FOOTIES"
                  onClick={closeMenu}
                  className="px-4 py-4 text-xs uppercase tracking-[0.2em] text-neutral-400 hover:text-white border-b border-white/5"
                >
                  Alomziee Footies
                </Link>

                {/* OUTFIT BUILDER */}

                <Link
                  href="/outfit-builder"
                  onClick={closeMenu}
                  className="px-4 py-4 flex items-center justify-between text-xs uppercase tracking-[0.2em] text-neutral-400 hover:text-white border-b border-white/5"
                >
                  <span>Outfit Builder</span>

                  <span className="text-lg leading-none">
                    🧍
                  </span>
                </Link>

                {/* JOIN VÉRANE */}

                <Link
                  href={account ? "/account" : "/join"}
                  onClick={closeMenu}
                  className="px-4 py-4 text-xs uppercase tracking-[0.2em] text-neutral-400 hover:text-white border-b border-white/5"
                >
                  {account
                    ? "My Account"
                    : "Join VÉRANE"}
                </Link>

                {/* SIGN OUT */}

                {account && (
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="text-left px-4 py-4 text-xs uppercase tracking-[0.2em] text-neutral-500 hover:text-white"
                  >
                    Sign Out
                  </button>
                )}

              </nav>

              {/* MOBILE MENU FOOTER */}

              <div className="mt-6 px-4 flex items-center justify-between">

                <div>
                  <p className="text-[9px] uppercase tracking-[0.3em] text-neutral-500">
                    VÉRANE
                  </p>

                  <p className="mt-1 text-[8px] uppercase tracking-[0.2em] text-neutral-700">
                    Two brands. One expression.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeMenu}
                  className="text-[9px] uppercase tracking-[0.2em] text-neutral-500 hover:text-white"
                >
                  Close
                </button>

              </div>

            </div>
          )}

        </div>
      </header>
    </>
  );
}