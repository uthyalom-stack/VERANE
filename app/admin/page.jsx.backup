"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminDashboard() {
  const router = useRouter();

  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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

        setAdmin(data.admin);
      } catch (error) {
        console.error("Admin session error:", error);
        router.replace("/admin/login");
      } finally {
        setLoading(false);
      }
    };

    loadSession();
  }, [router]);

  const logout = async () => {
    try {
      await fetch("/api/admin/logout", {
        method: "POST",
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

  if (isSuperAdmin) {
    return (
      <SuperAdminDashboard
        admin={admin}
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
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);


  const isUthy = accent === "amber";

  /*
   * ----------------------------------------------------------
   * LOAD ANALYTICS
   * ----------------------------------------------------------
   */

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        const response = await fetch(
          `/api/admin/analytics?brand=${brand}`,
          {
            cache: "no-store",
            credentials: "include",
          }
        );

        if (response.ok) {
          const data = await response.json();
          setAnalytics(data);
        }
      } catch (error) {
        console.error("Analytics error:", error);
      } finally {
        setAnalyticsLoading(false);
      }
    };

    loadAnalytics();
  }, [brand]);


  return (
    <main className="min-h-screen bg-[#070707] text-white">

      {/* BACKGROUND */}

      <div className="fixed inset-0 pointer-events-none overflow-hidden">

        <div
          className={`absolute -top-40 ${
            isUthy
              ? "right-[-100px] bg-amber-400/[0.045]"
              : "left-[-100px] bg-violet-500/[0.045]"
          } w-[500px] h-[500px] rounded-full blur-[140px]`}
        />

        <div className="absolute bottom-[-200px] right-[20%] w-[450px] h-[450px] rounded-full bg-white/[0.015] blur-[130px]" />

      </div>


      {/* ======================================================
          HEADER
      ====================================================== */}

      <header className="relative z-30 border-b border-white/[0.07] bg-black/60 backdrop-blur-xl">

        <div className="max-w-[1500px] mx-auto px-5 sm:px-8 py-5">

          <div className="flex items-center justify-between">

            {/* BRAND */}

            <div className="flex items-center gap-4">

              <div
                className={`w-11 h-11 rounded-2xl border flex items-center justify-center ${
                  isUthy
                    ? "border-amber-400/20 bg-amber-400/[0.06]"
                    : "border-violet-400/20 bg-violet-400/[0.06]"
                }`}
              >

                <span
                  className={`font-black ${
                    isUthy
                      ? "text-amber-400"
                      : "text-violet-300"
                  }`}
                >
                  {isUthy ? "U" : "A"}
                </span>

              </div>

              <div>

                <p className="text-sm font-black tracking-tight">
                  {brandName}
                </p>

                <p className="text-[9px] uppercase tracking-[0.25em] text-neutral-600 mt-0.5">
                  {subtitle} · Admin
                </p>

              </div>

            </div>


            {/* ==================================================
                RIGHT SIDE
            ================================================== */}

            <div className="flex items-center gap-3">

              {/* ADMIN NAME */}

              <div className="hidden sm:block text-right mr-1">

                <p className="text-xs font-bold">
                  {admin.name}
                </p>

                <p className="text-[9px] uppercase tracking-wider text-neutral-600">
                  Administrator
                </p>

              </div>


              {/* LOGOUT */}

              <button
                onClick={onLogout}
                className="rounded-xl border border-white/10 px-4 py-2.5 text-[10px] uppercase tracking-wider font-bold text-neutral-500 hover:text-white hover:border-white/20 transition"
              >
                Logout
              </button>

            </div>

          </div>

        </div>

      </header>


      {/* ======================================================
          CONTENT
      ====================================================== */}

      <div className="relative z-10 max-w-[1500px] mx-auto px-5 sm:px-8 py-8 md:py-10">

        {/* TOP */}

        <section className="mb-9">

          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5">

            <div>

              <p
                className={`text-[9px] uppercase tracking-[0.35em] font-bold ${
                  isUthy
                    ? "text-amber-400"
                    : "text-violet-300"
                }`}
              >
                {brandName} / Overview
              </p>

              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-[-0.04em] mt-2">
                Good morning,{" "}
                {admin.name?.split(" ")[0] || "Admin"}.
              </h1>

              <p className="text-sm text-neutral-500 mt-3">
                Here's what's happening with{" "}
                {brandName} today.
              </p>

            </div>

            <div className="flex gap-2">

              {/* START COLLABORATION */}

              <button
                onClick={() =>
                  router.push(
                    "/admin/collaborations"
                  )
                }
                className="rounded-2xl border border-white/10 bg-white/[0.025] px-5 py-3 text-xs font-black hover:bg-white/[0.05] hover:border-white/20 transition"
              >
                Collaborate
              </button>


              {/* MANAGE PRODUCTS */}

              <button
                onClick={() =>
                  router.push("/admin/products")
                }
                className={`rounded-2xl px-5 py-3 text-xs font-black transition ${
                  isUthy
                    ? "bg-amber-500 text-black hover:bg-amber-400"
                    : "bg-violet-300 text-black hover:bg-violet-200"
                }`}
              >
                Manage Products →
              </button>

            </div>

          </div>

        </section>


        {/* ======================================================
            KPI CARDS
        ====================================================== */}

        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-8">

  <StatCard
    label="Revenue"
    value={
      analyticsLoading
        ? "—"
        : formatMoney(
            analytics?.overview?.revenue ??
              analytics?.revenue ??
              analytics?.totalRevenue ??
              0
          )
    }
    change={
      analytics?.overview?.revenueChange ??
      analytics?.revenueChange ??
      analytics?.revenueGrowth
    }
    accent={accent}
  />

  <StatCard
    label="Orders"
    value={
      analyticsLoading
        ? "—"
        : formatNumber(
            analytics?.overview?.orders ??
              analytics?.orders ??
              analytics?.totalOrders ??
              0
          )
    }
    change={
      analytics?.overview?.ordersChange ??
      analytics?.ordersChange ??
      analytics?.ordersGrowth
    }
    accent={accent}
  />

  <StatCard
    label="Products"
    value={
      analyticsLoading
        ? "—"
        : formatNumber(
            analytics?.overview?.products ??
              analytics?.products ??
              analytics?.totalProducts ??
              0
          )
    }
    accent={accent}
  />

  <StatCard
    label="Low Stock"
    value={
      analyticsLoading
        ? "—"
        : formatNumber(
            analytics?.overview?.lowStock ??
              analytics?.lowStock ??
              analytics?.lowStockProducts ??
              0
          )
    }
    warning
  />

</section>


        {/* ======================================================
            COLLABORATION ALERT
        ====================================================== */}

        {incomingCollaborationCount > 0 && (
          <section className="mb-8">

            <button
              type="button"
              onClick={() =>
                router.push(
                  "/admin/collaborations"
                )
              }
              className={`w-full rounded-[1.75rem] border p-5 text-left transition ${
                isUthy
                  ? "border-amber-400/20 bg-amber-400/[0.035] hover:bg-amber-400/[0.06]"
                  : "border-violet-300/20 bg-violet-300/[0.035] hover:bg-violet-300/[0.06]"
              }`}
            >

              <div className="flex items-center justify-between gap-5">

                <div className="flex items-center gap-4">

                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center ${
                      isUthy
                        ? "bg-amber-400/[0.1] text-amber-400"
                        : "bg-violet-300/[0.1] text-violet-300"
                    }`}
                  >

                    <svg
                      width="19"
                      height="19"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <path
                        d="M8 12C6.34315 12 5 10.6569 5 9C5 7.34315 6.34315 6 8 6C9.65685 6 11 7.34315 11 9C11 10.6569 9.65685 12 8 12Z"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />

                      <path
                        d="M16 12C14.3431 12 13 10.6569 13 9C13 7.34315 14.3431 6 16 6C17.6569 6 19 7.34315 19 9C19 10.6569 17.6569 12 16 12Z"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />

                      <path
                        d="M3 19C3 16.7909 4.79086 15 7 15H9C11.2091 15 13 16.7909 13 19"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />

                      <path
                        d="M13 19C13 16.7909 14.7909 15 17 15H17C19.2091 15 21 16.7909 21 19"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>

                  </div>

                  <div>

                    <p className="text-xs uppercase tracking-[0.2em] font-black">
                      Collaboration Request
                    </p>

                    <p className="text-sm text-neutral-400 mt-1">
                      You have{" "}
                      <span className="text-white font-bold">
                        {incomingCollaborationCount}
                      </span>{" "}
                      incoming collaboration{" "}
                      {incomingCollaborationCount === 1
                        ? "request"
                        : "requests"}.
                    </p>

                  </div>

                </div>

                <span
                  className={`hidden sm:block text-[9px] uppercase tracking-wider font-bold ${
                    isUthy
                      ? "text-amber-400"
                      : "text-violet-300"
                  }`}
                >
                  Review →
                </span>

              </div>

            </button>

          </section>
        )}


        {/* ======================================================
            MAIN GRID
        ====================================================== */}

        <section className="grid lg:grid-cols-3 gap-4 mb-8">

          {/* SALES CHART */}

          <div className="lg:col-span-2 rounded-[1.75rem] border border-white/[0.08] bg-white/[0.025] overflow-hidden">

            <div className="p-6 border-b border-white/[0.06]">

              <div className="flex items-center justify-between">

                <div>

                  <p className="text-[9px] uppercase tracking-[0.25em] text-neutral-600">
                    Performance
                  </p>

                  <h2 className="text-lg font-black mt-1">
                    Sales Overview
                  </h2>

                </div>

                <span className="text-[9px] uppercase tracking-wider text-neutral-600 border border-white/10 rounded-full px-3 py-1.5">
                  Last 30 days
                </span>

              </div>

            </div>

            <SalesChart
              data={
                analytics?.sales ||
                analytics?.salesByDay ||
                analytics?.dailySales ||
                []
              }
              accent={accent}
            />

          </div>


          {/* QUICK ACTIONS */}

          <div className="rounded-[1.75rem] border border-white/[0.08] bg-white/[0.025] p-6">

            <p className="text-[9px] uppercase tracking-[0.25em] text-neutral-600">
              Workspace
            </p>

            <h2 className="text-lg font-black mt-1">
              Quick Actions
            </h2>

            <div className="space-y-2 mt-6">

              <QuickAction
                title="Products"
                description="Manage your catalog"
                onClick={() =>
                  router.push(
                    `/admin/products?brand=${
                      brand === "UTHY"
                        ? "UTHY_LUXURY"
                        : "ALOMZIEE_FOOTIES"
                    }`
                  )
                }
              />

              <QuickAction
                title="Orders"
                description="View customer orders"
                onClick={() =>
                  router.push("/admin/orders")
                }
              />

              <QuickAction
                title="Collections"
                description="Organize your catalog"
                onClick={() =>
                  router.push(
                    "/admin/collections"
                  )
                }
              />

              <QuickAction
                title="Collaborations"
                description="Start or manage brand collaborations"
                onClick={() =>
                  router.push(
                    "/admin/collaborations"
                  )
                }
              />

              <QuickAction
                title="Add Product"
                description="Create a new product"
                onClick={() =>
                  router.push(
                    "/admin/products/add"
                  )
                }
              />

            </div>

          </div>

        </section>


        {/* ======================================================
            LOWER GRID
        ====================================================== */}

        <section className="grid lg:grid-cols-2 gap-4">

          {/* BEST SELLERS */}

          <div className="rounded-[1.75rem] border border-white/[0.08] bg-white/[0.025]">

            <div className="p-6 border-b border-white/[0.06]">

              <p className="text-[9px] uppercase tracking-[0.25em] text-neutral-600">
                Products
              </p>

              <h2 className="text-lg font-black mt-1">
                Best Sellers
              </h2>

            </div>

            <div className="p-4">

              {analytics?.bestSellers?.length > 0 ? (

                analytics.bestSellers
                  .slice(0, 5)
                  .map((product, index) => (
                    <ProductRow
                      key={
                        product.id || index
                      }
                      product={product}
                      index={index}
                      accent={accent}
                    />
                  ))

              ) : (

                <EmptyState
                  title="Sales data will appear here"
                  description="Once products start selling, your best performers will show up here."
                />

              )}

            </div>

          </div>


          {/* RECENT ORDERS */}

          <div className="rounded-[1.75rem] border border-white/[0.08] bg-white/[0.025]">

            <div className="p-6 border-b border-white/[0.06] flex items-center justify-between">

              <div>

                <p className="text-[9px] uppercase tracking-[0.25em] text-neutral-600">
                  Commerce
                </p>

                <h2 className="text-lg font-black mt-1">
                  Recent Orders
                </h2>

              </div>

              <button
                onClick={() =>
                  router.push("/admin/orders")
                }
                className="text-[9px] uppercase tracking-wider text-neutral-600 hover:text-white transition"
              >
                View all →
              </button>

            </div>

            <div className="p-4">

              {analytics?.recentOrders?.length > 0 ? (

                analytics.recentOrders
                  .slice(0, 5)
                  .map((order, index) => (
                    <OrderRow
                      key={
                        order.id || index
                      }
                      order={order}
                    />
                  ))

              ) : (

                <EmptyState
                  title="No recent orders"
                  description="New customer orders will appear here."
                />

              )}

            </div>

          </div>

        </section>


        {/* FOOTER STATUS */}

        <div className="mt-8 flex items-center justify-between">

          <div className="flex items-center gap-2">

            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />

            <span className="text-[9px] uppercase tracking-[0.25em] text-neutral-700">
              System operational
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
   SUPER ADMIN DASHBOARD
============================================================ */

function SuperAdminDashboard({
  admin,
  onLogout,
  router,
}) {
  return (
    <main className="min-h-screen bg-[#070707] text-white">

      {/* BACKGROUND */}

      <div className="fixed inset-0 pointer-events-none overflow-hidden">

        <div className="absolute -top-60 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full bg-amber-400/[0.035] blur-[160px]" />

        <div className="absolute bottom-[-250px] left-[-100px] w-[600px] h-[600px] rounded-full bg-white/[0.015] blur-[150px]" />

      </div>


      {/* HEADER */}

      <header className="relative z-10 border-b border-white/[0.07] bg-black/60 backdrop-blur-xl">

        <div className="max-w-[1500px] mx-auto px-5 sm:px-8 py-5 flex items-center justify-between">

          <div className="flex items-center gap-4">

            <div className="w-11 h-11 rounded-2xl border border-amber-400/20 bg-amber-400/[0.06] flex items-center justify-center">

              <span className="text-amber-400 font-black">
                V
              </span>

            </div>

            <div>

              <p className="text-sm font-black">
                VÉRANE
              </p>

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


      {/* CONTENT */}

      <div className="relative z-10 max-w-[1500px] mx-auto px-5 sm:px-8 py-10">

        <section className="mb-10">

          <p className="text-[9px] uppercase tracking-[0.35em] text-amber-400 font-bold">
            Super Administration
          </p>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-[-0.05em] mt-2">
            Control the experience.
          </h1>

          <p className="text-sm text-neutral-500 mt-4 max-w-xl leading-relaxed">
            Manage the VÉRANE storefront, content,
            navigation, branding and platform systems
            from one place.
          </p>

        </section>


        {/* SITE CONTROLS */}

        <section className="mb-10">

          <div className="flex items-end justify-between mb-5">

            <div>

              <p className="text-[9px] uppercase tracking-[0.3em] text-neutral-600">
                Storefront
              </p>

              <h2 className="text-xl font-black mt-1">
                Website Management
              </h2>

            </div>

          </div>


          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">

            <ControlCard
              title="Homepage"
              description="Hero, sections & featured content"
              icon="⌂"
              featured
              onClick={() =>
                router.push(
                  "/admin/homepage"
                )
              }
            />

            <ControlCard
              title="Navigation"
              description="Menus, links & structure"
              icon="≡"
              onClick={() =>
                router.push(
                  "/admin/navigation"
                )
              }
            />

            <ControlCard
              title="Pages"
              description="About, FAQ & custom pages"
              icon="▤"
              onClick={() =>
                router.push("/admin/pages")
              }
            />

            <ControlCard
              title="Footer"
              description="Footer content & links"
              icon="⌄"
              onClick={() =>
                router.push("/admin/footer")
              }
            />

            <ControlCard
              title="Media"
              description="Website imagery & assets"
              icon="◈"
              onClick={() =>
                router.push("/admin/media")
              }
            />

            <ControlCard
              title="Brands"
              description="Brand identity & configuration"
              icon="◇"
              onClick={() =>
                router.push("/admin/brands")
              }
            />

            <ControlCard
              title="Collections"
              description="Storefront collections"
              icon="□"
              onClick={() =>
                router.push(
                  "/admin/collections"
                )
              }
            />

            <ControlCard
              title="Settings"
              description="Global website settings"
              icon="⚙"
              onClick={() =>
                router.push(
                  "/admin/settings"
                )
              }
            />

          </div>

        </section>


        {/* PLATFORM SYSTEMS */}

        <section>

          <p className="text-[9px] uppercase tracking-[0.3em] text-neutral-600 mb-5">
            Platform Systems
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">

            <ControlCard
              title="Discounts"
              description="Promotions & discount rules"
              icon="%"
              onClick={() =>
                router.push(
                  "/admin/discounts"
                )
              }
            />

            <ControlCard
              title="Subscribers"
              description="Email subscribers"
              icon="✉"
              onClick={() =>
                router.push(
                  "/admin/subscribers"
                )
              }
            />

            <ControlCard
              title="Orders"
              description="Platform order management"
              icon="◌"
              onClick={() =>
                router.push(
                  "/admin/orders"
                )
              }
            />

            <ControlCard
              title="Collaborations"
              description="Manage brand collaboration requests"
              icon="⇄"
              featured
              onClick={() =>
                router.push(
                  "/admin/collaborations"
                )
              }
            />

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


/* ============================================================
   COMPONENTS
============================================================ */

function StatCard({
  label,
  value,
  change,
  accent,
  warning,
}) {
  const isUthy = accent === "amber";

  return (
    <div className="rounded-[1.5rem] border border-white/[0.08] bg-white/[0.025] p-5">

      <p className="text-[9px] uppercase tracking-[0.22em] text-neutral-600">
        {label}
      </p>

      <p
        className={`text-2xl md:text-3xl font-black tracking-tight mt-3 ${
          warning
            ? "text-orange-300"
            : isUthy
            ? "text-amber-400"
            : "text-violet-300"
        }`}
      >
        {value}
      </p>

      {change !== undefined &&
        change !== null &&
        change !== "" && (
          <p className="text-[9px] text-emerald-400 mt-2">
            {String(change).includes("%")
              ? change
              : `${change}%`}
          </p>
        )}

    </div>
  );
}


function QuickAction({
  title,
  description,
  onClick,
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between rounded-2xl border border-white/[0.06] bg-black/30 px-4 py-4 text-left hover:bg-white/[0.035] hover:border-white/10 transition"
    >

      <div>

        <p className="text-xs font-black">
          {title}
        </p>

        <p className="text-[9px] text-neutral-600 mt-1">
          {description}
        </p>

      </div>

      <span className="text-neutral-700">
        →
      </span>

    </button>
  );
}


function ProductRow({
  product,
  index,
  accent,
}) {
  const image =
    Array.isArray(product.images) &&
    product.images.length > 0
      ? product.images[0]
      : null;

  return (
    <div className="flex items-center gap-4 px-2 py-3 border-b border-white/[0.05] last:border-0">

      <span className="w-6 text-[9px] text-neutral-700 font-bold">
        {String(index + 1).padStart(2, "0")}
      </span>

      <div className="w-11 h-11 rounded-xl overflow-hidden bg-black border border-white/[0.06] flex-shrink-0">

        {image ? (
          <img
            src={image}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[7px] text-neutral-700">
            NO IMAGE
          </div>
        )}

      </div>

      <div className="min-w-0 flex-1">

        <p className="text-xs font-bold truncate">
          {product.name || "Product"}
        </p>

        <p className="text-[9px] text-neutral-600 mt-1">
          {product.unitsSold ??
            product.quantitySold ??
            product.sales ??
            0}{" "}
          sold
        </p>

      </div>

      <p
        className={`text-xs font-black ${
          accent === "amber"
            ? "text-amber-400"
            : "text-violet-300"
        }`}
      >
        {formatMoney(
          product.revenue ??
            product.totalRevenue ??
            product.price ??
            0
        )}
      </p>

    </div>
  );
}


function OrderRow({ order }) {
  return (
    <div className="flex items-center justify-between gap-4 px-2 py-3 border-b border-white/[0.05] last:border-0">

      <div className="min-w-0">

        <p className="text-xs font-bold truncate">
          {order.customerName ||
            order.customer ||
            order.email ||
            "Customer"}
        </p>

        <p className="text-[9px] text-neutral-600 mt-1">
          #{String(order.id || "").slice(-8)}
        </p>

      </div>

      <div className="text-right">

        <p className="text-xs font-black">
          {formatMoney(
            order.total ??
              order.amount ??
              0
          )}
        </p>

        <p className="text-[9px] text-neutral-600 mt-1 uppercase">
          {order.status || "Pending"}
        </p>

      </div>

    </div>
  );
}


function SalesChart({
  data,
  accent,
}) {
  if (
    !Array.isArray(data) ||
    data.length === 0
  ) {
    return (
      <div className="h-[280px] flex items-center justify-center">

        <div className="text-center">

          <div className="w-12 h-12 rounded-2xl border border-white/[0.06] bg-white/[0.02] flex items-center justify-center mx-auto">

            <span className="text-neutral-700">
              ↗
            </span>

          </div>

          <p className="text-xs font-bold text-neutral-500 mt-4">
            Your sales chart will appear here
          </p>

          <p className="text-[9px] text-neutral-700 mt-2">
            Sales activity will populate automatically.
          </p>

        </div>

      </div>
    );
  }

  const values = data.map((item) =>
    Number(
      item.value ??
        item.revenue ??
        item.sales ??
        item.amount ??
        0
    )
  );

  const max = Math.max(
    ...values,
    1
  );

  return (
    <div className="h-[280px] px-6 py-7 flex items-end gap-1">

      {values.map((value, index) => {

        const height = Math.max(
          5,
          (value / max) * 100
        );

        return (
          <div
            key={index}
            className="flex-1 h-full flex items-end group"
          >

            <div
              title={formatMoney(value)}
              style={{
                height: `${height}%`,
              }}
              className={`w-full rounded-t-md transition-all group-hover:opacity-80 ${
                accent === "amber"
                  ? "bg-amber-400/70"
                  : "bg-violet-300/70"
              }`}
            />

          </div>
        );
      })}

    </div>
  );
}


function ControlCard({
  title,
  description,
  icon,
  onClick,
  featured,
}) {
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

      <p className="text-sm font-black mt-7">
        {title}
      </p>

      <p className="text-[9px] leading-relaxed text-neutral-600 mt-1">
        {description}
      </p>

    </button>
  );
}


function EmptyState({
  title,
  description,
}) {
  return (
    <div className="py-10 text-center">

      <p className="text-xs font-bold text-neutral-500">
        {title}
      </p>

      <p className="text-[9px] text-neutral-700 mt-2 max-w-xs mx-auto">
        {description}
      </p>

    </div>
  );
}


function LoadingScreen() {
  return (
    <main className="min-h-screen bg-[#070707] text-white flex items-center justify-center">

      <div className="text-center">

        <div className="w-12 h-12 rounded-2xl border border-amber-400/20 bg-amber-400/[0.04] flex items-center justify-center mx-auto">

          <span className="text-amber-400 font-black">
            V
          </span>

        </div>

        <p className="text-[9px] uppercase tracking-[0.35em] text-neutral-600 mt-5">
          VÉRANE
        </p>

        <p className="text-xs text-neutral-700 mt-2">
          Loading administration...
        </p>

      </div>

    </main>
  );
}


/* ============================================================
   HELPERS
============================================================ */

function formatMoney(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "₦0";
  }

  return `₦${number.toLocaleString(
    "en-NG",
    {
      maximumFractionDigits: 0,
    }
  )}`;
}


function formatNumber(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "0";
  }

  return number.toLocaleString("en-NG");
}