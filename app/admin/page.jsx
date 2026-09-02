"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminDashboard() {
  const router = useRouter();

  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadSession = async () => {
      try {
        const response = await fetch("/api/admin/session", {
          cache: "no-store",
          credentials: "include",
        });

        if (!response.ok) {
          router.replace("/admin/login");
          return;
        }

        const data = await response.json();

        if (!data?.admin) {
          router.replace("/admin/login");
          return;
        }

        if (mounted) {
          setAdmin(data.admin);
        }
      } catch (error) {
        console.error("Admin session error:", error);
        router.replace("/admin/login");
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadSession();

    return () => {
      mounted = false;
    };
  }, [router]);

  const logout = async () => {
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
  };

  if (loading) {
    return <LoadingScreen />;
  }

  if (!admin) {
    return null;
  }

  const isUthy = admin.role === "UTHY";
  const isAlomziee = admin.role === "ALOMZIEE";
  const isSuperAdmin = admin.role === "SUPERADMIN";

  if (isSuperAdmin) {
    return (
      <SuperAdminDashboard admin={admin} onLogout={logout} router={router} />
    );
  }

  if (isUthy) {
    return (
      <BrandDashboard
        admin={admin}
        brand="UTHY"
        brandName="UTHY LUXURY"
        subtitle="Fashion House"
        accent="amber"
        onLogout={logout}
        router={router}
      />
    );
  }

  if (isAlomziee) {
    return (
      <BrandDashboard
        admin={admin}
        brand="ALOMZIEE"
        brandName="ALOMZIEE FOOTIES"
        subtitle="Footwear House"
        accent="violet"
        onLogout={logout}
        router={router}
      />
    );
  }

  return null;
}

/* ============================================================
   BRAND ADMIN DASHBOARD
============================================================ */

function BrandDashboard({
  admin,
  brand,
  brandName,
  subtitle,
  accent,
  onLogout,
  router,
}) {
  const isUthy = accent === "amber";
  const productBrand = brand === "UTHY" ? "UTHY_LUXURY" : "ALOMZIEE_FOOTIES";

  const accentClasses = isUthy
    ? {
        text: "text-amber-400",
        bg: "bg-amber-500",
        hover: "hover:bg-amber-400",
        soft: "bg-amber-400/[0.06]",
        border: "border-amber-400/20",
      }
    : {
        text: "text-violet-300",
        bg: "bg-violet-300",
        hover: "hover:bg-violet-200",
        soft: "bg-violet-300/[0.06]",
        border: "border-violet-300/20",
      };

  const go = (path) => {
    router.push(path);
  };

  return (
    <main className="min-h-screen bg-[#070707] text-white">
      {/* BACKGROUND */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className={`absolute -top-40 ${
            isUthy
              ? "right-[-120px] bg-amber-400/[0.035]"
              : "left-[-120px] bg-violet-500/[0.035]"
          } w-[500px] h-[500px] rounded-full blur-[150px]`}
        />
        <div className="absolute bottom-[-200px] right-[15%] w-[450px] h-[450px] rounded-full bg-white/[0.012] blur-[140px]" />
      </div>

      {/* HEADER */}
      <header className="relative z-20 border-b border-white/[0.07] bg-black/70 backdrop-blur-xl">
        <div className="max-w-[1400px] mx-auto px-5 sm:px-8 py-5">
          <div className="flex items-center justify-between gap-5">
            <div className="flex items-center gap-4 min-w-0">
              <div
                className={`w-11 h-11 shrink-0 rounded-2xl border flex items-center justify-center ${accentClasses.border} ${accentClasses.soft}`}
              >
                <span className={`font-black ${accentClasses.text}`}>
                  {isUthy ? "U" : "A"}
                </span>
              </div>

              <div className="min-w-0">
                <p className="text-sm font-black tracking-tight truncate">
                  {brandName}
                </p>
                <p className="text-[9px] uppercase tracking-[0.25em] text-neutral-600 mt-0.5">
                  {subtitle} · Admin
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden sm:block text-right">
                <p className="text-xs font-bold">
                  {admin.name || "Administrator"}
                </p>
                <p className="text-[9px] uppercase tracking-wider text-neutral-600 mt-0.5">
                  {admin.email || "Administrator"}
                </p>
              </div>

              <button
                type="button"
                onClick={onLogout}
                className="rounded-xl border border-white/10 px-4 py-2.5 text-[10px] uppercase tracking-wider font-bold text-neutral-500 hover:text-white hover:border-white/20 transition"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* CONTENT */}
      <div className="relative z-10 max-w-[1400px] mx-auto px-5 sm:px-8 py-8 md:py-10">
        {/* WELCOME */}
        <section className="mb-10">
          <p
            className={`text-[9px] uppercase tracking-[0.35em] font-bold ${accentClasses.text}`}
          >
            {brandName} / Workspace
          </p>

          <div className="mt-2 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-[-0.04em]">
                Welcome back
                {admin.name ? `, ${admin.name.split(" ")[0]}` : ""}.
              </h1>
              <p className="text-sm text-neutral-500 mt-3 max-w-xl">
                Manage your {brandName} store from one place.
              </p>
            </div>

            <button
              type="button"
              onClick={() => go("/admin/analytics")}
              className={`rounded-2xl px-6 py-3.5 text-xs font-black text-black transition ${accentClasses.bg} ${accentClasses.hover}`}
            >
              View Analytics →
            </button>
          </div>
        </section>

        {/* MAIN WORKSPACE CARDS */}
        <section className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {/* ANALYTICS */}
          <DashboardCard
            icon="analytics"
            title="Analytics"
            description="View brand sales, revenue trends, customer acquisition and inventory performance."
            accent={accent}
            onClick={() => go("/admin/analytics")}
            primary
          />

          {/* PRODUCTS */}
          <DashboardCard
            icon="products"
            title="Products"
            description="Add, edit and manage products for your store."
            accent={accent}
            onClick={() => go(`/admin/products?brand=${productBrand}`)}
          />

          {/* CATEGORIES */}
          <DashboardCard
            icon="categories"
            title="Categories"
            description="Manage the categories available in your store."
            accent={accent}
            onClick={() => go(`/admin/categories?brand=${productBrand}`)}
          />

          {/* COLLECTIONS */}
          <DashboardCard
            icon="collections"
            title="Collections"
            description="Create and organize your store collections."
            accent={accent}
            onClick={() => go(`/admin/collections?brand=${productBrand}`)}
          />

          {/* ORDERS */}
          <DashboardCard
            icon="orders"
            title="Orders"
            description="View and manage customer orders."
            accent={accent}
            onClick={() => go("/admin/orders")}
          />

          {/* COLLABORATIONS */}
          <DashboardCard
            icon="collaboration"
            title="Collaborations"
            description="Manage collaborations between the two brands."
            accent={accent}
            onClick={() => go("/admin/collaborations")}
          />
        </section>

        {/* QUICK ACTIONS */}
        <section className="rounded-[1.75rem] border border-white/[0.08] bg-white/[0.025] overflow-hidden mb-8">
          <div className="p-6 border-b border-white/[0.06]">
            <p className="text-[9px] uppercase tracking-[0.25em] text-neutral-600">
              Workspace
            </p>
            <h2 className="text-lg font-black mt-1">Quick Actions</h2>
            <p className="text-xs text-neutral-600 mt-2">
              Common actions for {brandName}.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4">
            <QuickActionButton
              title="Store Analytics"
              description="Review revenue & charts"
              accent={accent}
              onClick={() => go("/admin/analytics")}
            />
            <QuickActionButton
              title="Add Product"
              description="Create a new product"
              accent={accent}
              onClick={() => go("/admin/products/add")}
            />
            <QuickActionButton
              title="View Orders"
              description="Check customer orders"
              accent={accent}
              onClick={() => go("/admin/orders")}
            />
            <QuickActionButton
              title="Collaborate"
              description="Manage collaborations"
              accent={accent}
              onClick={() => go("/admin/collaborations")}
            />
          </div>
        </section>

        {/* STATUS */}
        <div className="mt-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-[9px] uppercase tracking-[0.25em] text-neutral-700">
              Admin workspace ready
            </span>
          </div>
          <p className="text-[9px] text-neutral-800 uppercase tracking-wider">
            VÉRANE Commerce Platform
          </p>
        </div>
      </div>
    </main>
  );
}

/* ============================================================
   DASHBOARD CARD
============================================================ */

function DashboardCard({
  title,
  description,
  onClick,
  accent,
  icon,
  primary = false,
}) {
  const isUthy = accent === "amber";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group text-left rounded-[1.75rem] border p-6 transition ${
        primary
          ? isUthy
            ? "border-amber-400/20 bg-amber-400/[0.045] hover:bg-amber-400/[0.07]"
            : "border-violet-300/20 bg-violet-300/[0.045] hover:bg-violet-300/[0.07]"
          : "border-white/[0.08] bg-white/[0.025] hover:bg-white/[0.045] hover:border-white/[0.14]"
      }`}
    >
      <div className="flex items-start justify-between gap-5">
        <div
          className={`w-11 h-11 rounded-2xl flex items-center justify-center ${
            isUthy
              ? "bg-amber-400/[0.08] text-amber-400"
              : "bg-violet-300/[0.08] text-violet-300"
          }`}
        >
          <DashboardIcon type={icon} />
        </div>

        <span
          className={`text-lg transition-transform group-hover:translate-x-1 ${
            isUthy ? "text-amber-400" : "text-violet-300"
          }`}
        >
          →
        </span>
      </div>

      <h3 className="text-base font-black mt-6">{title}</h3>
      <p className="text-xs text-neutral-500 leading-relaxed mt-2">
        {description}
      </p>
    </button>
  );
}

function QuickActionButton({ title, description, onClick, accent }) {
  const isUthy = accent === "amber";

  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left rounded-2xl border border-white/[0.07] bg-black/20 p-4 hover:bg-white/[0.04] hover:border-white/[0.13] transition"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black">{title}</p>
          <p className="text-[10px] text-neutral-600 mt-1">{description}</p>
        </div>
        <span
          className={`text-sm ${isUthy ? "text-amber-400" : "text-violet-300"}`}
        >
          →
        </span>
      </div>
    </button>
  );
}

function DashboardIcon({ type }) {
  if (type === "analytics") {
    return (
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
        <path d="M18 20V10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M12 20V4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M6 20V14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }

  if (type === "products") {
    return (
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
        <path
          d="M4 7.5L12 3L20 7.5V16.5L12 21L4 16.5V7.5Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M4 7.5L12 12L20 7.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path d="M12 12V21" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    );
  }

  if (type === "categories") {
    return (
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
        <rect x="4" y="4" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
        <rect x="14" y="4" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
        <rect x="4" y="14" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
        <rect x="14" y="14" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    );
  }

  if (type === "collections") {
    return (
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
        <path d="M5 5H19V19H5V5Z" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8 9H16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M8 13H16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }

  if (type === "orders") {
    return (
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
        <path d="M5 7H19V20H5V7Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M9 7C9 4.79086 10.3431 3 12 3C13.6569 3 15 4.79086 15 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M9 12H15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }

  if (type === "collaboration") {
    return (
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
        <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="16" cy="8" r="3" stroke="currentColor" strokeWidth="1.5" />
        <path d="M3 19C3 16.2386 5.23858 14 8 14C10.7614 14 13 16.2386 13 19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M11 19C11 16.2386 13.2386 14 16 14C18.7614 14 21 16.2386 21 19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
      <path d="M4 6H20V18H4V6Z" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4 7L12 13L20 7" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function LoadingScreen() {
  return (
    <main className="min-h-screen bg-[#070707] text-white flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 rounded-full border border-white/10 border-t-white animate-spin mx-auto" />
        <p className="text-[9px] uppercase tracking-[0.3em] text-neutral-600 mt-5">
          Loading workspace
        </p>
      </div>
    </main>
  );
}

/* ============================================================
   SUPER ADMIN DASHBOARD
============================================================ */

function SuperAdminDashboard({ admin, onLogout, router }) {
  return (
    <main className="min-h-screen bg-[#070707] text-white">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-60 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full bg-amber-400/[0.035] blur-[160px]" />
        <div className="absolute bottom-[-250px] left-[-100px] w-[600px] h-[600px] rounded-full bg-white/[0.015] blur-[150px]" />
      </div>

      <header className="relative z-10 border-b border-white/[0.07] bg-black/60 backdrop-blur-xl">
        <div className="max-w-[1500px] mx-auto px-5 sm:px-8 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-2xl border border-amber-400/20 bg-amber-400/[0.06] flex items-center justify-center">
              <span className="text-amber-400 font-black">V</span>
            </div>
            <div>
              <p className="text-sm font-black">VÉRANE</p>
              <p className="text-[9px] uppercase tracking-[0.25em] text-neutral-600 mt-0.5">
                Platform Control
              </p>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="rounded-xl border border-white/10 px-4 py-2.5 text-[10px] uppercase tracking-wider font-bold text-neutral-500 hover:text-white hover:border-white/20 transition"
          >
            Logout
          </button>
        </div>
      </header>

      <div className="relative z-10 max-w-[1500px] mx-auto px-5 sm:px-8 py-10">
        <section className="mb-10">
          <p className="text-[9px] uppercase tracking-[0.35em] text-amber-400 font-bold">
            Super Administration
          </p>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-[-0.05em] mt-2">
            Control the experience.
          </h1>
          <p className="text-sm text-neutral-500 mt-4 max-w-xl leading-relaxed">
            Manage the VÉRANE storefront, content, navigation, branding and platform systems from one place.
          </p>
        </section>

        <section className="mb-10">
          <div className="flex items-end justify-between mb-5">
            <div>
              <p className="text-[9px] uppercase tracking-[0.3em] text-neutral-600">
                Storefront
              </p>
              <h2 className="text-xl font-black mt-1">Website Management</h2>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            <ControlCard title="Homepage" description="Hero, sections & featured content" icon="⌂" featured onClick={() => router.push("/admin/homepage")} />
            <ControlCard title="Navigation" description="Menus, links & structure" icon="≡" onClick={() => router.push("/admin/navigation")} />
            <ControlCard title="Pages" description="About, FAQ & custom pages" icon="▤" onClick={() => router.push("/admin/pages")} />
            <ControlCard title="Footer" description="Footer content & links" icon="⌄" onClick={() => router.push("/admin/footer")} />
            <ControlCard title="Media" description="Website imagery & assets" icon="◈" onClick={() => router.push("/admin/media")} />
            <ControlCard title="Brands" description="Brand identity & configuration" icon="◇" onClick={() => router.push("/admin/brands")} />
            <ControlCard title="Collections" description="Storefront collections" icon="□" onClick={() => router.push("/admin/collections")} />
            <ControlCard title="Settings" description="Global website settings" icon="⚙" onClick={() => router.push("/admin/settings")} />
          </div>
        </section>

        <section>
          <p className="text-[9px] uppercase tracking-[0.3em] text-neutral-600 mb-5">
            Platform Systems
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <ControlCard title="Discounts" description="Promotions & discount rules" icon="%" onClick={() => router.push("/admin/discounts")} />
            <ControlCard title="Subscribers" description="Email subscribers" icon="✉" onClick={() => router.push("/admin/subscribers")} />
            <ControlCard title="Orders" description="Platform order management" icon="◌" onClick={() => router.push("/admin/orders")} />
            <ControlCard title="Delivery" description="Manage countries, cities & rates" icon="✈" onClick={() => router.push("/admin/delivery")} />
            <ControlCard title="Collaborations" description="Manage brand collaboration requests" icon="⇄" featured onClick={() => router.push("/admin/collaborations")} />
          </div>
        </section>

        <div className="mt-10 pt-6 border-t border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-[9px] uppercase tracking-[0.25em] text-neutral-700">
              Platform operational
            </span>
          </div>
          <p className="text-[9px] text-neutral-800 uppercase tracking-wider">
            VÉRANE Super Admin
          </p>
        </div>
      </div>
    </main>
  );
}

function ControlCard({ title, description, icon, onClick, featured }) {
  return (
    <button
      onClick={onClick}
      className={`group text-left rounded-[1.5rem] border p-5 transition-all duration-300 ${
        featured
          ? "border-amber-400/20 bg-amber-400/[0.035] hover:bg-amber-400/[0.06]"
          : "border-white/[0.08] bg-white/[0.025] hover:bg-white/[0.045] hover:border-white/[0.15]"
      }`}
    >
      <div className="flex items-start justify-between">
        <span
          className={`text-lg ${
            featured
              ? "text-amber-400"
              : "text-neutral-500 group-hover:text-white"
          } transition`}
        >
          {icon}
        </span>
        <span className="text-neutral-700 group-hover:text-neutral-400 transition">
          ↗
        </span>
      </div>

      <p className="text-sm font-black mt-7">{title}</p>
      <p className="text-[9px] leading-relaxed text-neutral-600 mt-1">
        {description}
      </p>
    </button>
  );
}
