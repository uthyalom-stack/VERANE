"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function AdminLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const auth = localStorage.getItem("adminAuth");

    if (auth !== "true") {
      router.replace("/admin/login");
    }
  }, [router]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const links = [
    { href: "/admin", label: "Dashboard" },
    { href: "/admin/products", label: "Products" },
    { href: "/admin/collections", label: "Collections" },
    { href: "/admin/orders", label: "Orders" },
    { href: "/admin/homepage", label: "Homepage" },
    { href: "/admin/navigation", label: "Navigation" },
    { href: "/admin/footer", label: "Footer" },
    { href: "/admin/pages", label: "Pages" },
    { href: "/admin/brands", label: "Brands" },
    { href: "/admin/settings", label: "Settings" },
    { href: "/admin/subscribers", label: "Subscribers" },
  ];

  const isActive = (href) => {
    if (href === "/admin") {
      return pathname === "/admin";
    }

    return (
      pathname === href ||
      pathname.startsWith(`${href}/`)
    );
  };

  function logout() {
    localStorage.removeItem("adminAuth");
    setMenuOpen(false);
    router.replace("/admin/login");
  }

  return (
    <div className="min-h-screen bg-black text-white">

      {/* ADMIN NAVIGATION */}
      <nav className="sticky top-0 z-50 border-b border-white/5 bg-black/80 backdrop-blur-xl">

        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-6">

          {/* LEFT */}
          <div className="flex items-center gap-3">

            <button
              type="button"
              onClick={() =>
                setMenuOpen((current) => !current)
              }
              aria-label={
                menuOpen
                  ? "Close admin menu"
                  : "Open admin menu"
              }
              aria-expanded={menuOpen}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-neutral-900 text-lg text-white transition hover:bg-neutral-800 lg:hidden"
            >
              {menuOpen ? "×" : "☰"}
            </button>

            <Link
              href="/admin"
              className="text-lg font-black tracking-[-0.03em] text-amber-500 transition hover:text-amber-400"
            >
              VÉRANE ADMIN
            </Link>

          </div>

          {/* DESKTOP ACTIONS */}
          <div className="flex items-center gap-4">

            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-neutral-400 transition hover:text-white"
            >
              View Site
            </a>

            <button
              type="button"
              onClick={logout}
              className="rounded-full bg-red-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-red-500"
            >
              Logout
            </button>

          </div>

        </div>

        {/* DESKTOP NAV */}
        <div className="mx-auto hidden max-w-7xl overflow-x-auto px-4 pb-3 lg:block md:px-6">

          <div className="flex min-w-max items-center gap-1">

            {links.map((link) => {
              const active = isActive(link.href);

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                    active
                      ? "bg-amber-500 text-black"
                      : "text-neutral-400 hover:bg-white/[0.05] hover:text-white"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}

          </div>

        </div>

        {/* MOBILE NAV */}
        <div
          className={`overflow-hidden border-t border-white/5 transition-all duration-300 lg:hidden ${
            menuOpen
              ? "max-h-[700px] opacity-100"
              : "max-h-0 opacity-0"
          }`}
        >

          <div className="px-4 pb-4 pt-3">

            <div className="space-y-1 rounded-2xl border border-white/10 bg-neutral-950 p-2">

              {links.map((link) => {
                const active = isActive(link.href);

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() =>
                      setMenuOpen(false)
                    }
                    className={`block rounded-xl px-4 py-3 text-sm font-semibold transition ${
                      active
                        ? "bg-amber-500 text-black"
                        : "text-neutral-300 hover:bg-white/[0.05] hover:text-white"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}

            </div>

            <button
              type="button"
              onClick={logout}
              className="mt-3 w-full rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm font-bold text-red-400 transition hover:bg-red-500/10"
            >
              Logout
            </button>

          </div>

        </div>

      </nav>

      {/* PAGE CONTENT */}
      <main className="p-4 md:p-6">
        {children}
      </main>

    </div>
  );
}