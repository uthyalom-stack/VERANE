"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";

const links = [
  {
    href: "/admin",
    label: "Dashboard",
    icon: "⌂",
  },
  {
    href: "/admin/products",
    label: "Products",
    icon: "◈",
  },
  {
    href: "/admin/products/add",
    label: "Add Product",
    icon: "+",
  },
  {
    href: "/admin/orders",
    label: "Orders",
    icon: "□",
  },
  {
    href: "/admin/subscribers",
    label: "Subscribers",
    icon: "◎",
  },
  {
    href: "/admin/settings",
    label: "Settings",
    icon: "⚙",
  },
];

export default function AdminLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    if (pathname === "/admin/login") {
      setCheckingAuth(false);
      return;
    }

    const auth = localStorage.getItem("adminAuth");

    if (!auth) {
      router.replace("/admin/login");
      return;
    }

    setCheckingAuth(false);
  }, [pathname, router]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  if (checkingAuth && pathname !== "/admin/login") {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <div className="text-center">
          <div className="text-amber-500 text-sm font-black tracking-[0.35em]">
            VÉRANE
          </div>
          <p className="text-neutral-600 text-xs mt-3">
            Loading admin...
          </p>
        </div>
      </div>
    );
  }

  if (pathname === "/admin/login") {
    return children;
  }

  const isActive = (href) => {
    if (href === "/admin") {
      return pathname === "/admin";
    }

    if (href === "/admin/products") {
      return (
        pathname === "/admin/products" ||
        pathname.startsWith("/admin/products/")
      );
    }

    return pathname === href;
  };

  const logout = () => {
    localStorage.removeItem("adminAuth");
    router.replace("/admin/login");
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* DESKTOP SIDEBAR */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 z-50 w-72 flex-col border-r border-white/10 bg-neutral-950">
        <div className="px-7 py-8 border-b border-white/10">
          <Link href="/admin" className="block">
            <p className="text-amber-500 text-[10px] font-bold uppercase tracking-[0.4em]">
              VÉRANE
            </p>

            <h1 className="text-xl font-black tracking-tight mt-1">
              ADMIN
            </h1>
          </Link>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          <p className="px-3 mb-3 text-[9px] font-bold uppercase tracking-[0.3em] text-neutral-700">
            Management
          </p>

          {links.map((link) => {
            const active = isActive(link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-4 px-4 py-3.5 rounded-xl text-sm transition ${
                  active
                    ? "bg-amber-500 text-black font-bold"
                    : "text-neutral-500 hover:text-white hover:bg-white/5"
                }`}
              >
                <span className="w-5 text-center text-base">
                  {link.icon}
                </span>

                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10 space-y-2">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center w-full px-4 py-3 rounded-xl border border-white/10 text-xs font-bold text-neutral-400 hover:text-white hover:bg-white/5 transition"
          >
            View Store ↗
          </a>

          <button
            onClick={logout}
            className="w-full px-4 py-3 rounded-xl text-xs font-bold text-red-400 hover:bg-red-500/10 transition"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* MOBILE HEADER */}
      <header className="lg:hidden sticky top-0 z-50 border-b border-white/10 bg-black/90 backdrop-blur-xl">
        <div className="h-16 px-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="w-10 h-10 rounded-xl border border-white/10 bg-neutral-950 flex items-center justify-center text-lg"
            aria-label="Open admin menu"
          >
            ☰
          </button>

          <Link href="/admin" className="text-center">
            <p className="text-amber-500 text-[8px] font-bold tracking-[0.35em]">
              VÉRANE
            </p>
            <p className="text-xs font-black tracking-wider">
              ADMIN
            </p>
          </Link>

          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="w-10 h-10 rounded-xl border border-white/10 bg-neutral-950 flex items-center justify-center text-xs text-neutral-400"
            aria-label="View store"
          >
            ↗
          </a>
        </div>
      </header>

      {/* MOBILE OVERLAY */}
      {menuOpen && (
        <div
          className="lg:hidden fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* MOBILE DRAWER */}
      <aside
        className={`lg:hidden fixed inset-y-0 left-0 z-[70] w-[82%] max-w-sm bg-neutral-950 border-r border-white/10 transform transition-transform duration-300 ${
          menuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="h-full flex flex-col">
          <div className="px-6 py-7 border-b border-white/10 flex items-center justify-between">
            <div>
              <p className="text-amber-500 text-[10px] font-bold uppercase tracking-[0.4em]">
                VÉRANE
              </p>
              <h2 className="text-xl font-black mt-1">
                ADMIN
              </h2>
            </div>

            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              className="w-10 h-10 rounded-xl border border-white/10 text-neutral-400 hover:text-white"
              aria-label="Close admin menu"
            >
              ×
            </button>
          </div>

          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            <p className="px-3 mb-3 text-[9px] font-bold uppercase tracking-[0.3em] text-neutral-700">
              Management
            </p>

            {links.map((link) => {
              const active = isActive(link.href);

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center gap-4 px-4 py-4 rounded-xl text-sm transition ${
                    active
                      ? "bg-amber-500 text-black font-bold"
                      : "text-neutral-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <span className="w-5 text-center">
                    {link.icon}
                  </span>

                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-white/10 space-y-2">
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center w-full px-4 py-3.5 rounded-xl border border-white/10 text-xs font-bold text-neutral-400"
            >
              View Store ↗
            </a>

            <button
              onClick={logout}
              className="w-full px-4 py-3.5 rounded-xl text-xs font-bold text-red-400 hover:bg-red-500/10"
            >
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* PAGE CONTENT */}
      <div className="lg:pl-72 min-h-screen">
        {children}
      </div>
    </div>
  );
}