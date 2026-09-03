"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";

export default function AdminLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();

  const [menuOpen, setMenuOpen] = useState(false);
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      try {
        const response = await fetch("/api/admin/session", {
          cache: "no-store",
          credentials: "include",
        });

        const data = await response.json().catch(() => null);

        if (!response.ok || !data?.authenticated || !data?.admin) {
          router.replace("/admin/login");
          return;
        }

        if (!cancelled) {
          setAdmin(data.admin);
        }
      } catch (error) {
        console.error("Admin session loading error:", error);

        if (!cancelled) {
          router.replace("/admin/login");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadSession();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const isSuperAdmin = admin?.role === "SUPERADMIN";
  const isStoreAdmin = admin?.role === "UTHY" || admin?.role === "ALOMZIEE";

  useEffect(() => {
    setMenuOpen(false);
    setNotificationsOpen(false);
  }, [pathname]);

  async function loadNotifications() {
    if (!isStoreAdmin) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    try {
      const response = await fetch("/api/admin/notifications", {
        cache: "no-store",
        credentials: "include",
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        console.error("Notifications request failed:", response.status);
        return;
      }

      setNotifications(Array.isArray(data?.notifications) ? data.notifications : []);
      setUnreadCount(Number(data?.unreadCount || 0));
    } catch (error) {
      console.error("Notifications loading error:", error);
    }
  }

  useEffect(() => {
    if (!admin || !isStoreAdmin) return;

    // Notifications are deliberately isolated from the admin page lifecycle.
    // A database/API failure here must never prevent the dashboard from rendering.
    const timeout = setTimeout(() => {
      loadNotifications();
    }, 0);

    const interval = setInterval(loadNotifications, 15000);

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [admin, isStoreAdmin]);

  async function markAllNotificationsRead() {
    try {
      await fetch("/api/admin/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "readAll" }),
      });

      await loadNotifications();
    } catch (error) {
      console.error("Mark notifications read error:", error);
    }
  }

  async function openNotifications() {
    const nextOpen = !notificationsOpen;
    setNotificationsOpen(nextOpen);

    if (nextOpen && unreadCount > 0) {
      await markAllNotificationsRead();
    }
  }

  async function logout() {
    try {
      await fetch("/api/admin/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Logout error:", error);
    }

    router.replace("/admin/login");
    router.refresh();
  }

  const links = [
    { href: "/admin", label: "Dashboard", show: true },
    { href: "/admin/products", label: "Products", show: isStoreAdmin },
    { href: "/admin/categories", label: "Categories", show: isStoreAdmin },
    { href: "/admin/collections", label: "Collections", show: isStoreAdmin },
    { href: "/admin/storefront", label: "Store Page", show: isStoreAdmin },
    { href: "/admin/orders", label: "Orders", show: isStoreAdmin },
    { href: "/admin/discounts", label: "Discounts", show: isStoreAdmin },
    { href: "/admin/subscribers", label: "Subscribers", show: true },
    { href: "/admin/collaborations", label: "Collaborations", show: isStoreAdmin },
    { href: "/admin/marketing", label: "Marketing", show: isStoreAdmin },
    { href: "/admin/analytics", label: "Analytics", show: isStoreAdmin },
    { href: "/admin/delivery", label: "Delivery & Logistics", show: isSuperAdmin },
    { href: "/admin/homepage", label: "Homepage", show: isSuperAdmin },
    { href: "/admin/navigation", label: "Navigation", show: isSuperAdmin },
    { href: "/admin/footer", label: "Footer", show: isSuperAdmin },
    { href: "/admin/pages", label: "Pages", show: isSuperAdmin },
    { href: "/admin/media", label: "Media", show: isSuperAdmin },
    { href: "/admin/brands", label: "Brands", show: isSuperAdmin },
    { href: "/admin/settings", label: "Settings", show: isSuperAdmin },
  ].filter((link) => link.show);

  const isActive = (href) => {
    if (href === "/admin") return pathname === "/admin";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-amber-400 text-[10px] uppercase tracking-[0.35em]">VÉRANE</p>
          <p className="mt-3 text-sm text-neutral-600">Loading administration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <nav className="sticky top-0 z-50 border-b border-white/5 bg-black/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMenuOpen((current) => !current)}
              aria-label={menuOpen ? "Close admin menu" : "Open admin menu"}
              aria-expanded={menuOpen}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-neutral-900 text-lg text-white transition hover:bg-neutral-800 lg:hidden"
            >
              {menuOpen ? "×" : "☰"}
            </button>

            <Link href="/admin" className="text-lg font-black tracking-[-0.03em] text-amber-500 transition hover:text-amber-400">
              VÉRANE ADMIN
            </Link>
          </div>

          <div className="flex items-center gap-3">
            {isStoreAdmin && (
              <div className="relative">
                <button
                  type="button"
                  onClick={openNotifications}
                  aria-label="Open notifications"
                  className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-neutral-900 text-white transition hover:bg-neutral-800"
                >
                  <span className="text-base">🔔</span>
                  {unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-black text-white">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>

                {notificationsOpen && (
                  <div className="absolute right-0 top-12 w-[330px] overflow-hidden rounded-2xl border border-white/10 bg-neutral-950 shadow-2xl">
                    <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
                      <div>
                        <p className="text-xs font-black">Notifications</p>
                        <p className="mt-1 text-[9px] uppercase tracking-wider text-neutral-600">Collaboration activity</p>
                      </div>
                      <button type="button" onClick={() => router.push("/admin/collaborations")} className="text-[9px] uppercase tracking-wider text-amber-400 hover:text-amber-300">
                        View all
                      </button>
                    </div>

                    <div className="max-h-[380px] overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="px-5 py-10 text-center">
                          <p className="text-xs font-semibold text-neutral-500">No notifications</p>
                          <p className="mt-2 text-[10px] text-neutral-700">You're all caught up.</p>
                        </div>
                      ) : (
                        notifications.slice(0, 10).map((notification) => (
                          <button type="button" key={notification.id} onClick={() => router.push("/admin/collaborations")} className="w-full border-b border-white/[0.05] px-4 py-4 text-left transition hover:bg-white/[0.03]">
                            <div className="flex gap-3">
                              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-amber-400" />
                              <div className="min-w-0">
                                <p className="text-xs font-bold">{notification.title}</p>
                                <p className="mt-1 text-[10px] leading-5 text-neutral-500">{notification.message}</p>
                                <p className="mt-2 text-[9px] text-neutral-700">{new Date(notification.createdAt).toLocaleString()}</p>
                              </div>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="hidden text-right sm:block">
              <p className="text-[9px] uppercase tracking-[0.2em] text-neutral-600">{isSuperAdmin ? "Platform Administration" : "Store Administration"}</p>
              <p className="text-xs font-bold text-neutral-300">{admin?.name}</p>
            </div>

            <a href="/" target="_blank" rel="noopener noreferrer" className="hidden text-sm text-neutral-400 transition hover:text-white sm:block">View Site</a>

            <button type="button" onClick={logout} className="rounded-full bg-red-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-red-500">Logout</button>
          </div>
        </div>

        <div className="mx-auto hidden max-w-7xl overflow-x-auto px-4 pb-3 lg:block md:px-6">
          <div className="flex min-w-max items-center gap-1">
            {links.map((link) => {
              const active = isActive(link.href);
              return (
                <Link key={link.href} href={link.href} className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${active ? "bg-amber-500 text-black" : "text-neutral-400 hover:bg-white/[0.05] hover:text-white"}`}>
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>

        <div className={`overflow-hidden border-t border-white/5 transition-all duration-300 lg:hidden ${menuOpen ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"}`}>
          <div className="px-4 pb-4 pt-3">
            <div className="space-y-1 rounded-2xl border border-white/10 bg-neutral-950 p-2">
              {links.map((link) => {
                const active = isActive(link.href);
                return (
                  <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)} className={`block rounded-xl px-4 py-3 text-sm font-semibold transition ${active ? "bg-amber-500 text-black" : "text-neutral-300 hover:bg-white/[0.05] hover:text-white"}`}>
                    {link.label}
                  </Link>
                );
              })}
            </div>

            <button type="button" onClick={logout} className="mt-3 w-full rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm font-bold text-red-400 transition hover:bg-red-500/10">Logout</button>
          </div>
        </div>
      </nav>

      <main className="p-4 md:p-6">{children}</main>
    </div>
  );
}
