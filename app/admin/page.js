```jsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminDashboard() {
  const router = useRouter();

  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadSession() {
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

        if (active) {
          setAdmin(data.admin);
        }
      } catch (error) {
        console.error("Admin session error:", error);
        router.replace("/admin/login");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadSession();

    return () => {
      active = false;
    };
  }, [router]);

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

  if (loading) {
    return <LoadingScreen />;
  }

  if (!admin) {
    return null;
  }

  const role = String(admin.role || "").toUpperCase();

  if (role === "SUPERADMIN") {
    return (
      <SuperAdminDashboard
        admin={admin}
        onLogout={logout}
        router={router}
      />
    );
  }

  const brand =
    role === "ALOMZIEE"
      ? "ALOMZIEE"
      : "UTHY";

  return (
    <BrandDashboard
      admin={admin}
      brand={brand}
      onLogout={logout}
      router={router}
    />
  );
}

/* ============================================================
   BRAND DASHBOARD
============================================================ */

function BrandDashboard({
  admin,
  brand,
  onLogout,
  router,
}) {
  const isUthy = brand === "UTHY";

  const brandName = isUthy
    ? "UTHY LUXURY"
    : "ALOMZIEE FOOTIES";

  const analyticsBrand = isUthy
    ? "UTHY_LUXURY"
    : "ALOMZIEE_FOOTIES";

  const accent = isUthy ? "amber" : "violet";

  const [analytics, setAnalytics] = useState(null);
  const [products, setProducts] = useState([]);

  const [loadingAnalytics, setLoadingAnalytics] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);

  const loadDashboard = useCallback(async () => {
    setLoadingAnalytics(true);
    setLoadingProducts(true);

    try {
      const [analyticsResponse, productsResponse] =
        await Promise.all([
          fetch(
            `/api/admin/analytics?brand=${encodeURIComponent(
              analyticsBrand
            )}&range=30d`,
            {
              cache: "no-store",
              credentials: "include",
            }
          ),

          fetch(
            `/api/admin/products?brand=${encodeURIComponent(
              analyticsBrand
            )}`,
            {
              cache: "no-store",
              credentials: "include",
            }
          ),
        ]);

      if (analyticsResponse.ok) {
        const analyticsData =
          await analyticsResponse.json();

        setAnalytics(analyticsData);
      } else {
        console.error(
          "Analytics request failed:",
          analyticsResponse.status
        );

        setAnalytics(null);
      }

      if (productsResponse.ok) {
        const productsData =
          await productsResponse.json();

        const list = Array.isArray(productsData)
          ? productsData
          : Array.isArray(productsData?.products)
          ? productsData.products
          : [];

        setProducts(list);
      } else {
        console.error(
          "Products request failed:",
          productsResponse.status
        );

        setProducts([]);
      }
    } catch (error) {
      console.error(
        "Dashboard loading error:",
        error
      );

      setAnalytics(null);
      setProducts([]);
    } finally {
      setLoadingAnalytics(false);
      setLoadingProducts(false);
    }
  }, [analyticsBrand]);

  useEffect(() => {
    loadDashboard();

    const interval = setInterval(
      loadDashboard,
      30000
    );

    return () => clearInterval(interval);
  }, [loadDashboard]);

  const overview =
    analytics?.overview || {};

  const analyticsData =
    analytics?.analytics || {};

  const revenue =
    Number(
      overview.revenue ??
        analytics?.revenue ??
        analyticsData.revenue ??
        0
    ) || 0;

  const orders =
    Number(
      overview.orders ??
        analytics?.orders ??
        analyticsData.orders ??
        0
    ) || 0;

  const productCount =
    products.length > 0
      ? products.length
      : Number(
          overview.products ??
            analytics?.products ??
            analyticsData.products ??
            0
        ) || 0;

  const lowStock =
    products.length > 0
      ? products.filter((product) => {
          const inventory = Number(
            product.inventory ??
              product.stock ??
              0
          );

          return inventory > 0 && inventory <= 5;
        }).length
      : Number(
          overview.lowStock ??
            analytics?.lowStock ??
            analyticsData.lowStock ??
            0
        ) || 0;

  const salesData =
    analyticsData.daily ||
    analytics?.daily ||
    analytics?.revenueOverTime ||
    [];

  const bestSellers =
    analyticsData.bestSellers ||
    analytics?.bestSellers ||
    [];

  const recentOrders =
    analytics?.recentOrders ||
    analyticsData.recentOrders ||
    [];

  const firstName =
    admin.name?.split(" ")[0] || "Admin";

  return (
    <main className="min-h-screen bg-[#070707] text-white">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className={`absolute -top-48 ${
            isUthy
              ? "right-[-100px] bg-amber-400/[0.045]"
              : "left-[-100px] bg-violet-500/[0.045]"
          } w-[500px] h-[500px] rounded-full blur-[140px]`}
        />

        <div className="absolute bottom-[-200px] right-[20%] w-[450px] h-[450px] rounded-full bg-white/[0.015] blur-[130px]" />
      </div>

      <header className="relative z-20 border-b border-white/[0.07] bg-black/70 backdrop-blur-xl">
        <div className="max-w-[1500px] mx-auto px-5 sm:px-8 py-5">
          <div className="flex items-center justify-between gap-4">
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
                <p className="text-sm font-black">
                  {brandName}
                </p>

                <p className="text-[9px] uppercase tracking-[0.25em] text-neutral-600 mt-1">
                  {isUthy
                    ? "Fashion House"
                    : "Footwear House"}{" "}
                  · Admin
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden sm:block text-right">
                <p className="text-xs font-bold">
                  {admin.name}
                </p>

                <p className="text-[9px] uppercase tracking-wider text-neutral-600">
                  Administrator
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  router.push(
                    `/admin/analytics?brand=${analyticsBrand}`
                  )
                }
                className={`hidden sm:block rounded-xl border px-4 py-2.5 text-[10px] uppercase tracking-wider font-bold transition ${
                  isUthy
                    ? "border-amber-400/20 text-amber-400 hover:bg-amber-400/[0.06]"
                    : "border-violet-300/20 text-violet-300 hover:bg-violet-300/[0.06]"
                }`}
              >
                Analytics
              </button>

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

      <div className="relative z-10 max-w-[1500px] mx-auto px-5 sm:px-8 py-8 md:py-10">
        <section className="mb-9">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
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
                Good morning, {firstName}.
              </h1>

              <p className="text-sm text-neutral-500 mt-3">
                Here's what's happening with{" "}
                {brandName} today.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <DashboardButton
                label="Analytics"
                onClick={() =>
                  router.push(
                    `/admin/analytics?brand=${analyticsBrand}`
                  )
                }
                accent={accent}
              />

              <DashboardButton
                label="Products"
                onClick={() =>
                  router.push(
                    `/admin/products?brand=${analyticsBrand}`
                  )
                }
              />

              <DashboardButton
                label="Add Product"
                primary
                onClick={() =>
                  router.push(
                    `/admin/products/add?brand=${analyticsBrand}`
                  )
                }
                accent={accent}
              />
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-8">
          <StatCard
            label="Revenue"
            value={
              loadingAnalytics
                ? "—"
                : formatMoney(revenue)
            }
            accent={accent}
          />

          <StatCard
            label="Orders"
            value={
              loadingAnalytics
                ? "—"
                : formatNumber(orders)
            }
            accent={accent}
          />

          <StatCard
            label="Products"
            value={
              loadingProducts
                ? "—"
                : formatNumber(productCount)
            }
            accent={accent}
          />

          <StatCard
            label="Low Stock"
            value={
              loadingProducts
                ? "—"
                : formatNumber(lowStock)
            }
            warning
          />
        </section>

        <section className="grid lg:grid-cols-3 gap-4 mb-8">
          <div className="lg:col-span-2 rounded-[1.75rem] border border-white/[0.08] bg-white/[0.025] overflow-hidden">
            <div className="p-6 border-b border-white/[0.06] flex items-center justify-between">
              <div>
                <p className="text-[9px] uppercase tracking-[0.25em] text-neutral-600">
                  Performance
                </p>

                <h2 className="text-lg font-black mt-1">
                  Sales Overview
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  router.push(
                    `/admin/analytics?brand=${analyticsBrand}`
                  )
                }
                className="text-[9px] uppercase tracking-wider text-neutral-600 border border-white/10 rounded-full px-3 py-1.5 hover:text-white hover:border-white/20 transition"
              >
                Full analytics →
              </button>
            </div>

            <SalesChart
              data={salesData}
              accent={accent}
            />
          </div>

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
                    `/admin/products?brand=${analyticsBrand}`
                  )
                }
                accent={accent}
              />

              <QuickAction
                title="Add Product"
                description="Create a new product"
                onClick={() =>
                  router.push(
                    `/admin/products/add?brand=${analyticsBrand}`
                  )
                }
                accent={accent}
              />

              <QuickAction
                title="Orders"
                description="View customer orders"
                onClick={() =>
                  router.push("/admin/orders")
                }
                accent={accent}
              />

              <QuickAction
                title="Analytics"
                description="Track sales and performance"
                onClick={() =>
                  router.push(
                    `/admin/analytics?brand=${analyticsBrand}`
                  )
                }
                accent={accent}
              />

              <QuickAction
                title="Collaborations"
                description="Manage brand collaborations"
                onClick={() =>
                  router.push(
                    "/admin/collaborations"
                  )
                }
                accent={accent}
              />
            </div>
          </div>
        </section>

        <section className="grid lg:grid-cols-2 gap-4">
          <Panel
            eyebrow="Products"
            title="Best Sellers"
            action="View products"
            onAction={() =>
              router.push(
                `/admin/products?brand=${analyticsBrand}`
              )
            }
          >
            {bestSellers.length > 0 ? (
              bestSellers
                .slice(0, 5)
                .map((product, index) => (
                  <ProductRow
                    key={product.id || index}
                    product={product}
                    index={index}
                    accent={accent}
                  />
                ))
            ) : (
              <EmptyState
                title="No sales yet"
                description="Your best-selling products will appear here after orders are placed."
              />
            )}
          </Panel>

          <Panel
            eyebrow="Commerce"
            title="Recent Orders"
            action="View all"
            onAction={() =>
              router.push("/admin/orders")
            }
          >
            {recentOrders.length > 0 ? (
              recentOrders
                .slice(0, 5)
                .map((order, index) => (
                  <OrderRow
                    key={order.id || index}
                    order={order}
                  />
                ))
            ) : (
              <EmptyState
                title="No recent orders"
                description="New customer orders will appear here automatically."
              />
            )}
          </Panel>
        </section>

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
   SUPER ADMIN
============================================================ */

function SuperAdminDashboard({
  admin,
  onLogout,
  router,
}) {
  const cards = [
    [
      "Homepage",
      "Hero, sections & featured content",
      "/admin/homepage",
    ],
    [
      "Navigation",
      "Menus, links & structure",
      "/admin/navigation",
    ],
    [
      "Pages",
      "About, FAQ & custom pages",
      "/admin/pages",
    ],
    [
      "Footer",
      "Footer content & links",
      "/admin/footer",
    ],
    [
      "Media",
      "Website imagery & assets",
      "/admin/media",
    ],
    [
      "Brands",
      "Brand identity & configuration",
      "/admin/brands",
    ],
    [
      "Collections",
      "Storefront collections",
      "/admin/collections",
    ],
    [
      "Settings",
      "Global website settings",
      "/admin/settings",
    ],
    [
      "Analytics",
      "Platform-wide sales & performance",
      "/admin/analytics",
    ],
    [
      "Discounts",
      "Promotions & discount rules",
      "/admin/discounts",
    ],
    [
      "Subscribers",
      "Email subscribers",
      "/admin/subscribers",
    ],
    [
      "Orders",
      "Platform order management",
      "/admin/orders",
    ],
    [
      "Collaborations",
      "Brand collaboration requests",
      "/admin/collaborations",
    ],
  ];

  return (
    <main className="min-h-screen bg-[#070707] text-white">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-60 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full bg-amber-400/[0.035] blur-[160px]" />
      </div>

      <header className="relative z-10 border-b border-white/[0.07] bg-black/70 backdrop-blur-xl">
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

              <p className="text-[9px] uppercase tracking-[0.25em] text-neutral-600 mt-1">
                Platform Control
              </p>
            </div>
          </div>

          <button
            type="button"
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
            Manage the VÉRANE storefront, content,
            navigation, branding and platform systems
            from one place.
          </p>
        </section>

        <section>
          <p className="text-[9px] uppercase tracking-[0.3em] text-neutral-600 mb-5">
            Platform Control
          </p>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {cards.map(
              ([title, description, href]) => (
                <ControlCard
                  key={title}
                  title={title}
                  description={description}
                  onClick={() =>
                    router.push(href)
                  }
                />
              )
            )}
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
   UI
============================================================ */

function StatCard({
  label,
  value,
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
    </div>
  );
}

function DashboardButton({
  label,
  onClick,
  primary,
  accent,
}) {
  const isUthy = accent === "amber";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl px-5 py-3 text-xs font-black transition ${
        primary
          ? isUthy
            ? "bg-amber-400 text-black hover:bg-amber-300"
            : "bg-violet-300 text-black hover:bg-violet-200"
          : "border border-white/10 bg-white/[0.025] hover:bg-white/[0.05] hover:border-white/20"
      }`}
    >
      {label}
    </button>
  );
}

function QuickAction({
  title,
  description,
  onClick,
  accent,
}) {
  const isUthy = accent === "amber";

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center justify-between rounded-2xl border border-white/[0.06] bg-black/30 px-4 py-4 text-left hover:bg-white/[0.035] hover:border-white/10 transition"
    >
      <div>
        <p
          className={`text-xs font-black ${
            title === "Analytics" ||
            title === "Add Product"
              ? isUthy
                ? "text-amber-400"
                : "text-violet-300"
              : ""
          }`}
        >
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

function Panel({
  eyebrow,
  title,
  action,
  onAction,
  children,
}) {
  return (
    <div className="rounded-[1.75rem] border border-white/[0.08] bg-white/[0.025] overflow-hidden">
      <div className="p-6 border-b border-white/[0.06] flex items-center justify-between gap-4">
        <div>
          <p className="text-[9px] uppercase tracking-[0.25em] text-neutral-600">
            {eyebrow}
          </p>

          <h2 className="text-lg font-black mt-1">
            {title}
          </h2>
        </div>

        {action && (
          <button
            type="button"
            onClick={onAction}
            className="text-[9px] uppercase tracking-wider text-neutral-600 hover:text-white transition"
          >
            {action} →
          </button>
        )}
      </div>

      <div className="p-4">
        {children}
      </div>
    </div>
  );
}

function ProductRow({
  product,
  index,
  accent,
}) {
  const image = getProductImage(
    product?.images
  );

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
          {product.name ||
            "Product"}
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
          {order.customer?.name ||
            order.customerName ||
            order.customer ||
            order.email ||
            "Customer"}
        </p>

        <p className="text-[9px] text-neutral-600 mt-1">
          #{String(
            order.id || ""
          ).slice(-8)}
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
          {order.status ||
            "Pending"}
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
          <p className="text-xs font-bold text-neutral-500">
            Your sales chart will appear here
          </p>

          <p className="text-[9px] text-neutral-700 mt-2">
            Sales activity will populate automatically.
          </p>
        </div>
      </div>
    );
  }

  const values = data.map(
    (item) =>
      Number(
        item.value ??
          item.revenue ??
          item.sales ??
          item.amount ??
          0
      ) || 0
  );

  const max = Math.max(
    ...values,
    1
  );

  return (
    <div className="h-[280px] px-6 py-7 flex items-end gap-1">
      {values.map(
        (value, index) => {
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
                title={formatMoney(
                  value
                )}
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
        }
      )}
    </div>
  );
}

function ControlCard({
  title,
  description,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group text-left rounded-[1.5rem] border border-white/[0.08] bg-white/[0.025] hover:bg-white/[0.045] hover:border-white/[0.15] p-5 transition-all duration-300"
    >
      <div className="flex items-start justify-between">
        <span className="text-lg text-neutral-500 group-hover:text-white transition">
          •
        </span>

        <span className="text-neutral-700 group-hover:text-neutral-400 transition">
          →
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

function getProductImage(images) {
  if (!images) {
    return "";
  }

  if (Array.isArray(images)) {
    return images[0] || "";
  }

  if (typeof images === "string") {
    try {
      const parsed = JSON.parse(images);

      if (Array.isArray(parsed)) {
        return parsed[0] || "";
      }

      if (typeof parsed === "string") {
        return parsed;
      }
    } catch {
      return images;
    }
  }

  return "";
}

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
```
