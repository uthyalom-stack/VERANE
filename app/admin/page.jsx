"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminDashboard() {
  const router = useRouter();

  const [admin, setAdmin] = useState(null);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [time, setTime] = useState("");

  /* -----------------------------------------
     AUTH / ADMIN
  ----------------------------------------- */

  useEffect(() => {
    try {
      const cookies = document.cookie.split(";");

      const authCookie = cookies.find((cookie) =>
        cookie.trim().startsWith("adminAuth=")
      );

      if (authCookie) {
        const value = authCookie
          .split("=")
          .slice(1)
          .join("=");

        try {
          setAdmin(JSON.parse(decodeURIComponent(value)));
        } catch {
          setAdmin(null);
        }
      }
    } catch {
      setAdmin(null);
    }
  }, []);

  /* -----------------------------------------
     CLOCK
  ----------------------------------------- */

  useEffect(() => {
    const updateClock = () => {
      setTime(
        new Intl.DateTimeFormat("en-NG", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        }).format(new Date())
      );
    };

    updateClock();

    const interval = setInterval(updateClock, 30000);

    return () => clearInterval(interval);
  }, []);

  /* -----------------------------------------
     LOAD DASHBOARD DATA
  ----------------------------------------- */

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true);

        const [productsResponse, ordersResponse] =
          await Promise.allSettled([
            fetch("/api/products", {
              cache: "no-store",
            }),
            fetch("/api/admin/orders", {
              cache: "no-store",
            }),
          ]);

        if (
          productsResponse.status === "fulfilled" &&
          productsResponse.value.ok
        ) {
          const productData =
            await productsResponse.value.json();

          setProducts(
            Array.isArray(productData)
              ? productData
              : productData?.products || []
          );
        }

        if (
          ordersResponse.status === "fulfilled" &&
          ordersResponse.value.ok
        ) {
          const orderData =
            await ordersResponse.value.json();

          setOrders(
            Array.isArray(orderData)
              ? orderData
              : orderData?.orders || []
          );
        }
      } catch (error) {
        console.error(
          "Dashboard loading error:",
          error
        );
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  /* -----------------------------------------
     LOGOUT
  ----------------------------------------- */

  const logout = async () => {
    try {
      await fetch("/api/admin/logout", {
        method: "POST",
      });
    } catch {}

    document.cookie =
      "adminAuth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";

    router.replace("/admin/login");
  };

  /* -----------------------------------------
     ADMIN ACCESS
  ----------------------------------------- */

  const isSuperAdmin = admin?.brand === "ALL";

  const isUthy =
    admin?.brand === "UTHY_LUXURY" ||
    isSuperAdmin;

  const isAlomziee =
    admin?.brand === "ALOMZIEE_FOOTIES" ||
    isSuperAdmin;

  /* -----------------------------------------
     DASHBOARD STATS
  ----------------------------------------- */

  const totalProducts = products.length;

  const lowStockProducts = useMemo(() => {
    return products.filter((product) => {
      const stock = Number(product.inventory ?? 0);
      return stock > 0 && stock <= 5;
    });
  }, [products]);

  const outOfStockProducts = useMemo(() => {
    return products.filter(
      (product) =>
        Number(product.inventory ?? 0) <= 0
    );
  }, [products]);

  const pendingOrders = useMemo(() => {
    return orders.filter((order) => {
      const status = String(
        order.status || ""
      ).toLowerCase();

      return [
        "pending",
        "processing",
        "confirmed",
        "paid",
      ].includes(status);
    });
  }, [orders]);

  const revenue = useMemo(() => {
    return orders.reduce((total, order) => {
      const status = String(
        order.status || ""
      ).toLowerCase();

      if (
        ["cancelled", "canceled", "failed"].includes(
          status
        )
      ) {
        return total;
      }

      const amount =
        Number(
          order.total ??
            order.amount ??
            order.totalAmount ??
            0
        ) || 0;

      return total + amount;
    }, 0);
  }, [orders]);

  const formatMoney = (amount) => {
    return `₦${Number(amount || 0).toLocaleString(
      "en-NG"
    )}`;
  };

  /* -----------------------------------------
     QUICK NAV
  ----------------------------------------- */

  const go = (path) => {
    router.push(path);
  };

  return (
    <main className="min-h-screen bg-[#050505] text-white overflow-hidden">

      {/* -----------------------------------------
          BACKGROUND
      ----------------------------------------- */}

      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-amber-500/[0.035] blur-[120px]" />
        <div className="absolute top-[45%] -left-40 w-[400px] h-[400px] rounded-full bg-white/[0.02] blur-[120px]" />
      </div>

      {/* -----------------------------------------
          HEADER
      ----------------------------------------- */}

      <header className="relative z-10 border-b border-white/[0.07] bg-black/70 backdrop-blur-xl sticky top-0">

        <div className="max-w-[1500px] mx-auto px-5 sm:px-8 lg:px-10">

          <div className="h-[76px] flex items-center justify-between">

            {/* BRAND */}

            <button
              onClick={() => go("/admin")}
              className="text-left group"
            >
              <p className="text-[9px] uppercase tracking-[0.55em] text-neutral-600 group-hover:text-neutral-400 transition">
                VÉRANE
              </p>

              <div className="flex items-center gap-3 mt-1">

                <h1 className="text-lg font-black tracking-[0.08em]">
                  CONTROL CENTER
                </h1>

                <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/[0.06] px-2.5 py-1 text-[8px] uppercase tracking-[0.18em] text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live
                </span>

              </div>
            </button>

            {/* RIGHT */}

            <div className="flex items-center gap-3">

              <div className="hidden sm:block text-right mr-2">
                <p className="text-[9px] uppercase tracking-[0.25em] text-neutral-600">
                  Local Time
                </p>

                <p className="text-xs font-bold text-neutral-300 mt-1">
                  {time || "--:--"}
                </p>
              </div>

              {/* ADMIN */}

              <div className="hidden md:flex items-center gap-3 border-l border-white/[0.07] pl-4">

                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-300/20 to-white/[0.04] border border-white/10 flex items-center justify-center">
                  <span className="text-xs font-black text-amber-400">
                    {admin?.name
                      ? admin.name
                          .charAt(0)
                          .toUpperCase()
                      : "A"}
                  </span>
                </div>

                <div>
                  <p className="text-xs font-bold">
                    {admin?.name || "Administrator"}
                  </p>

                  <p className="text-[9px] uppercase tracking-[0.15em] text-neutral-600 mt-0.5">
                    {isSuperAdmin
                      ? "Super Admin"
                      : admin?.brand ===
                        "UTHY_LUXURY"
                      ? "UTHY LUXURY"
                      : "ALOMZIEE FOOTIES"}
                  </p>
                </div>

              </div>

              <button
                onClick={logout}
                className="rounded-xl border border-white/[0.08] px-3.5 py-2.5 text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-500 hover:text-white hover:border-white/20 hover:bg-white/[0.03] transition"
              >
                Logout
              </button>

            </div>

          </div>

        </div>

      </header>

      {/* -----------------------------------------
          CONTENT
      ----------------------------------------- */}

      <div className="relative z-10 max-w-[1500px] mx-auto px-5 sm:px-8 lg:px-10 py-8 lg:py-12">

        {/* -----------------------------------------
            HERO
        ----------------------------------------- */}

        <section className="mb-10">

          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">

            <div>

              <p className="text-[9px] uppercase tracking-[0.45em] text-amber-400 mb-3">
                Administration
              </p>

              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-[-0.04em]">
                Welcome back
                {admin?.name
                  ? `, ${admin.name.split(" ")[0]}`
                  : ""}
                .
              </h2>

              <p className="text-sm text-neutral-500 max-w-xl mt-4 leading-relaxed">
                Your VÉRANE storefront command center.
                Manage products, orders, content, brands,
                collections and the entire customer
                experience from one place.
              </p>

            </div>

            {/* QUICK ACTIONS */}

            <div className="flex flex-wrap gap-2">

              <button
                onClick={() =>
                  go("/admin/products/add")
                }
                className="rounded-full bg-amber-500 text-black px-5 py-3 text-[10px] font-black uppercase tracking-[0.12em] hover:bg-amber-400 transition"
              >
                + Add Product
              </button>

              <button
                onClick={() => go("/")}
                className="rounded-full border border-white/10 px-5 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-400 hover:text-white hover:bg-white/[0.03] transition"
              >
                View Store ↗
              </button>

            </div>

          </div>

        </section>

        {/* -----------------------------------------
            STAT CARDS
        ----------------------------------------- */}

        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-10">

          <StatCard
            label="Products"
            value={
              loading ? "—" : totalProducts
            }
            description="Catalog inventory"
            icon="◇"
            onClick={() => go("/admin/products")}
          />

          <StatCard
            label="Orders"
            value={loading ? "—" : orders.length}
            description={
              pendingOrders.length
                ? `${pendingOrders.length} require attention`
                : "All orders"
            }
            icon="◎"
            accent={
              pendingOrders.length > 0
            }
            onClick={() => go("/admin/orders")}
          />

          <StatCard
            label="Revenue"
            value={
              loading
                ? "—"
                : formatMoney(revenue)
            }
            description="Recorded order value"
            icon="₦"
            onClick={() => go("/admin/orders")}
          />

          <StatCard
            label="Stock Alerts"
            value={
              loading
                ? "—"
                : lowStockProducts.length +
                  outOfStockProducts.length
            }
            description={
              outOfStockProducts.length
                ? `${outOfStockProducts.length} out of stock`
                : "Inventory healthy"
            }
            icon="!"
            alert={
              lowStockProducts.length +
                outOfStockProducts.length >
              0
            }
            onClick={() => go("/admin/products")}
          />

        </section>

        {/* -----------------------------------------
            MAIN GRID
        ----------------------------------------- */}

        <div className="grid lg:grid-cols-[1.4fr_0.6fr] gap-5 mb-10">

          {/* QUICK COMMANDS */}

          <section className="rounded-[28px] border border-white/[0.08] bg-white/[0.018] overflow-hidden">

            <div className="px-6 py-6 border-b border-white/[0.07] flex items-center justify-between">

              <div>
                <p className="text-[9px] uppercase tracking-[0.35em] text-amber-400">
                  Command Center
                </p>

                <h3 className="text-xl font-black mt-1">
                  Quick Management
                </h3>
              </div>

              <span className="text-[9px] uppercase tracking-[0.2em] text-neutral-700">
                {isSuperAdmin
                  ? "Full Access"
                  : "Brand Access"}
              </span>

            </div>

            <div className="grid sm:grid-cols-2">

              <CommandCard
                title="Products"
                description="Add, edit, remove and organize your catalog."
                icon="◇"
                onClick={() =>
                  go("/admin/products")
                }
              />

              <CommandCard
                title="Orders"
                description="Monitor purchases and manage customer orders."
                icon="◎"
                onClick={() =>
                  go("/admin/orders")
                }
              />

              {isSuperAdmin && (
                <>
                  <CommandCard
                    title="Homepage"
                    description="Control the storefront's most important sections."
                    icon="⌂"
                    onClick={() =>
                      go("/admin/homepage")
                    }
                  />

                  <CommandCard
                    title="Collections"
                    description="Build and organize curated product collections."
                    icon="▦"
                    onClick={() =>
                      go("/admin/collections")
                    }
                  />

                  <CommandCard
                    title="Media"
                    description="Manage the visual assets used throughout VÉRANE."
                    icon="▧"
                    onClick={() =>
                      go("/admin/media")
                    }
                  />

                  <CommandCard
                    title="Discounts"
                    description="Create and manage promotional offers."
                    icon="%"
                    onClick={() =>
                      go("/admin/discounts")
                    }
                  />
                </>
              )}

              <CommandCard
                title="Brands"
                description="Manage the identities operating inside VÉRANE."
                icon="✦"
                onClick={() =>
                  go("/admin/brands")
                }
              />

              <CommandCard
                title="Settings"
                description="Configure the global storefront experience."
                icon="⚙"
                onClick={() =>
                  go("/admin/settings")
                }
              />

            </div>

          </section>

          {/* ATTENTION */}

          <section className="rounded-[28px] border border-white/[0.08] bg-white/[0.018] overflow-hidden">

            <div className="px-6 py-6 border-b border-white/[0.07]">

              <p className="text-[9px] uppercase tracking-[0.35em] text-amber-400">
                Attention
              </p>

              <h3 className="text-xl font-black mt-1">
                Store Health
              </h3>

            </div>

            <div className="p-5 space-y-2">

              <HealthItem
                label="Catalog"
                value={`${totalProducts} products`}
                good={totalProducts > 0}
                onClick={() =>
                  go("/admin/products")
                }
              />

              <HealthItem
                label="Orders"
                value={
                  pendingOrders.length
                    ? `${pendingOrders.length} pending`
                    : "No pending orders"
                }
                good={pendingOrders.length === 0}
                warning={
                  pendingOrders.length > 0
                }
                onClick={() =>
                  go("/admin/orders")
                }
              />

              <HealthItem
                label="Inventory"
                value={
                  outOfStockProducts.length
                    ? `${outOfStockProducts.length} unavailable`
                    : lowStockProducts.length
                    ? `${lowStockProducts.length} low stock`
                    : "Healthy"
                }
                good={
                  outOfStockProducts.length ===
                    0 &&
                  lowStockProducts.length === 0
                }
                warning={
                  lowStockProducts.length > 0
                }
                onClick={() =>
                  go("/admin/products")
                }
              />

              <HealthItem
                label="Storefront"
                value="Online"
                good
                onClick={() => go("/")}
              />

            </div>

            <div className="px-5 pb-5">

              <button
                onClick={() =>
                  go("/admin/settings")
                }
                className="w-full rounded-xl border border-white/[0.07] py-3 text-[9px] uppercase tracking-[0.2em] font-bold text-neutral-500 hover:text-white hover:bg-white/[0.03] transition"
              >
                Open System Settings →
              </button>

            </div>

          </section>

        </div>

        {/* -----------------------------------------
            BRAND MANAGEMENT
        ----------------------------------------- */}

        <section className="mb-10">

          <div className="mb-5">

            <p className="text-[9px] uppercase tracking-[0.4em] text-amber-400">
              Brand Architecture
            </p>

            <h3 className="text-2xl font-black mt-1">
              Your Brands
            </h3>

            <p className="text-xs text-neutral-600 mt-2">
              Two distinct identities. One unified
              VÉRANE experience.
            </p>

          </div>

          <div className="grid md:grid-cols-2 gap-4">

            {isUthy && (
              <BrandCard
                name="UTHY"
                fullName="UTHY LUXURY"
                type="Clothing & Apparel"
                description="Custom shirts, trousers, hoodies, traditional wear and elevated everyday pieces."
                number="01"
                onClick={() =>
                  go(
                    "/admin/products?brand=UTHY_LUXURY"
                  )
                }
              />
            )}

            {isAlomziee && (
              <BrandCard
                name="ALOMZIEE"
                fullName="ALOMZIEE FOOTIES"
                type="Footwear & Accessories"
                description="Shoes, sandals, slides, boots, belts, bags and accessories."
                number="02"
                onClick={() =>
                  go(
                    "/admin/products?brand=ALOMZIEE_FOOTIES"
                  )
                }
              />
            )}

          </div>

        </section>

        {/* -----------------------------------------
            CONTENT MANAGEMENT
        ----------------------------------------- */}

        {isSuperAdmin && (
          <section className="mb-10">

            <div className="mb-5">

              <p className="text-[9px] uppercase tracking-[0.4em] text-amber-400">
                Experience
              </p>

              <h3 className="text-2xl font-black mt-1">
                Storefront Control
              </h3>

            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">

              <MiniLink
                title="Homepage"
                icon="⌂"
                onClick={() =>
                  go("/admin/homepage")
                }
              />

              <MiniLink
                title="Navigation"
                icon="☰"
                onClick={() =>
                  go("/admin/navigation")
                }
              />

              <MiniLink
                title="Footer"
                icon="↓"
                onClick={() =>
                  go("/admin/footer")
                }
              />

              <MiniLink
                title="Pages"
                icon="▤"
                onClick={() =>
                  go("/admin/pages")
                }
              />

              <MiniLink
                title="Media"
                icon="▧"
                onClick={() =>
                  go("/admin/media")
                }
              />

              <MiniLink
                title="Subscribers"
                icon="✉"
                onClick={() =>
                  go("/admin/subscribers")
                }
              />

            </div>

          </section>
        )}

        {/* -----------------------------------------
            PRODUCT SNAPSHOT
        ----------------------------------------- */}

        <section className="rounded-[28px] border border-white/[0.08] bg-white/[0.018] overflow-hidden mb-10">

          <div className="px-6 py-6 border-b border-white/[0.07] flex items-center justify-between">

            <div>
              <p className="text-[9px] uppercase tracking-[0.35em] text-amber-400">
                Catalog
              </p>

              <h3 className="text-xl font-black mt-1">
                Inventory Snapshot
              </h3>
            </div>

            <button
              onClick={() =>
                go("/admin/products")
              }
              className="text-[9px] uppercase tracking-[0.2em] font-bold text-neutral-500 hover:text-white transition"
            >
              View Catalog →
            </button>

          </div>

          {loading ? (
            <div className="p-10 text-center text-xs text-neutral-600">
              Loading catalog...
            </div>
          ) : products.length === 0 ? (
            <div className="p-10 text-center">

              <p className="text-sm font-bold">
                Your catalog is empty.
              </p>

              <p className="text-xs text-neutral-600 mt-2">
                Add your first product to begin building
                the VÉRANE storefront.
              </p>

              <button
                onClick={() =>
                  go("/admin/products/add")
                }
                className="mt-5 rounded-full bg-amber-500 text-black px-5 py-2.5 text-[10px] font-black uppercase tracking-[0.12em]"
              >
                Add Product
              </button>

            </div>
          ) : (
            <div className="divide-y divide-white/[0.05]">

              {products.slice(0, 5).map((product) => {

                const image =
                  Array.isArray(product.images) &&
                  product.images.length
                    ? product.images[0]
                    : null;

                const stock =
                  Number(product.inventory ?? 0);

                return (
                  <button
                    key={product.id}
                    onClick={() =>
                      go(
                        `/admin/products/${product.id}/edit`
                      )
                    }
                    className="w-full px-5 sm:px-6 py-4 flex items-center gap-4 text-left hover:bg-white/[0.025] transition"
                  >

                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-neutral-950 border border-white/[0.07] shrink-0">

                      {image ? (
                        <img
                          src={image}
                          alt={product.name || "Product"}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[8px] text-neutral-700">
                          NO IMAGE
                        </div>
                      )}

                    </div>

                    <div className="min-w-0 flex-1">

                      <p className="text-sm font-bold truncate">
                        {product.name ||
                          "Unnamed Product"}
                      </p>

                      <p className="text-[9px] uppercase tracking-[0.15em] text-neutral-600 mt-1">
                        {product.brand ||
                          "VÉRANE"}
                      </p>

                    </div>

                    <div className="text-right">

                      <p className="text-xs font-bold text-amber-400">
                        {formatMoney(
                          product.price
                        )}
                      </p>

                      <p
                        className={`text-[9px] uppercase tracking-[0.12em] mt-1 ${
                          stock <= 0
                            ? "text-red-400"
                            : stock <= 5
                            ? "text-amber-400"
                            : "text-neutral-600"
                        }`}
                      >
                        {stock <= 0
                          ? "Out of stock"
                          : `${stock} in stock`}
                      </p>

                    </div>

                    <span className="text-neutral-700 ml-2">
                      →
                    </span>

                  </button>
                );
              })}

            </div>
          )}

        </section>

        {/* -----------------------------------------
            FOOTER
        ----------------------------------------- */}

        <footer className="pt-8 border-t border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-4">

          <div>

            <p className="text-[9px] uppercase tracking-[0.45em] text-neutral-700">
              VÉRANE
            </p>

            <p className="text-[10px] text-neutral-700 mt-1">
              Unified luxury commerce platform.
            </p>

          </div>

          <div className="flex items-center gap-4">

            {isSuperAdmin && (
              <button
                onClick={() =>
                  go("/admin/settings")
                }
                className="text-[9px] uppercase tracking-[0.15em] text-neutral-600 hover:text-white transition"
              >
                Settings
              </button>
            )}

            <button
              onClick={() => go("/")}
              className="text-[9px] uppercase tracking-[0.15em] text-neutral-600 hover:text-white transition"
            >
              Storefront ↗
            </button>

          </div>

        </footer>

      </div>

    </main>
  );
}


/* =====================================================
   STAT CARD
===================================================== */

function StatCard({
  label,
  value,
  description,
  icon,
  accent,
  alert,
  onClick,
}) {
  return (
    <button
      onClick={onClick}
      className="group text-left rounded-[24px] border border-white/[0.08] bg-white/[0.018] p-5 sm:p-6 hover:bg-white/[0.035] hover:border-white/[0.14] transition"
    >

      <div className="flex items-start justify-between">

        <span className="text-lg text-neutral-600 group-hover:text-amber-400 transition">
          {icon}
        </span>

        <span
          className={`w-1.5 h-1.5 rounded-full ${
            alert
              ? "bg-red-400"
              : accent
              ? "bg-amber-400"
              : "bg-emerald-400"
          }`}
        />

      </div>

      <p className="text-[9px] uppercase tracking-[0.25em] text-neutral-600 mt-6">
        {label}
      </p>

      <p className="text-2xl sm:text-3xl font-black mt-1 tracking-tight truncate">
        {value}
      </p>

      <p className="text-[10px] text-neutral-600 mt-2 truncate">
        {description}
      </p>

    </button>
  );
}


/* =====================================================
   COMMAND CARD
===================================================== */

function CommandCard({
  title,
  description,
  icon,
  onClick,
}) {
  return (
    <button
      onClick={onClick}
      className="group text-left p-6 border-b border-white/[0.06] sm:nth-[2n]:border-l border-white/[0.06] hover:bg-white/[0.025] transition"
    >

      <div className="flex items-start justify-between">

        <div className="w-10 h-10 rounded-xl border border-white/[0.08] bg-black flex items-center justify-center text-sm text-neutral-500 group-hover:text-amber-400 group-hover:border-amber-400/20 transition">
          {icon}
        </div>

        <span className="text-neutral-700 group-hover:text-amber-400 transition">
          ↗
        </span>

      </div>

      <h4 className="font-black mt-6">
        {title}
      </h4>

      <p className="text-xs text-neutral-600 leading-relaxed mt-2 max-w-xs">
        {description}
      </p>

    </button>
  );
}


/* =====================================================
   HEALTH ITEM
===================================================== */

function HealthItem({
  label,
  value,
  good,
  warning,
  onClick,
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 rounded-xl p-3 hover:bg-white/[0.025] transition text-left"
    >

      <span
        className={`w-2 h-2 rounded-full shrink-0 ${
          good
            ? "bg-emerald-400"
            : warning
            ? "bg-amber-400"
            : "bg-red-400"
        }`}
      />

      <div className="flex-1 min-w-0">

        <p className="text-xs font-bold">
          {label}
        </p>

        <p className="text-[9px] text-neutral-600 mt-0.5 truncate">
          {value}
        </p>

      </div>

      <span className="text-neutral-700 text-xs">
        →
      </span>

    </button>
  );
}


/* =====================================================
   BRAND CARD
===================================================== */

function BrandCard({
  name,
  fullName,
  type,
  description,
  number,
  onClick,
}) {
  return (
    <button
      onClick={onClick}
      className="group relative overflow-hidden rounded-[28px] border border-white/[0.08] bg-gradient-to-br from-white/[0.035] to-transparent p-7 text-left hover:border-amber-400/20 transition"
    >

      <div className="absolute right-6 top-5 text-[60px] font-black text-white/[0.025] leading-none pointer-events-none">
        {number}
      </div>

      <div className="relative">

        <div className="flex items-center justify-between">

          <div>

            <p className="text-[9px] uppercase tracking-[0.3em] text-amber-400">
              {type}
            </p>

            <h4 className="text-3xl font-black tracking-[-0.03em] mt-2">
              {name}
            </h4>

            <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-600 mt-1">
              {fullName}
            </p>

          </div>

          <span className="w-10 h-10 rounded-full border border-white/[0.08] flex items-center justify-center text-neutral-500 group-hover:text-amber-400 group-hover:border-amber-400/30 transition">
            →
          </span>

        </div>

        <p className="text-xs text-neutral-500 leading-relaxed mt-8 max-w-md">
          {description}
        </p>

        <div className="mt-6 flex items-center gap-2">

          <span className="text-[9px] uppercase tracking-[0.2em] text-neutral-600 group-hover:text-neutral-400 transition">
            Manage Brand
          </span>

          <span className="text-amber-400 text-xs">
            →
          </span>

        </div>

      </div>

    </button>
  );
}


/* =====================================================
   MINI LINK
===================================================== */

function MiniLink({
  title,
  icon,
  onClick,
}) {
  return (
    <button
      onClick={onClick}
      className="group rounded-2xl border border-white/[0.08] bg-white/[0.018] p-5 text-left hover:bg-white/[0.04] hover:border-white/[0.14] transition"
    >

      <div className="flex items-center justify-between">

        <span className="text-sm text-neutral-600 group-hover:text-amber-400 transition">
          {icon}
        </span>

        <span className="text-[10px] text-neutral-700 group-hover:text-white transition">
          →
        </span>

      </div>

      <p className="text-xs font-bold mt-5">
        {title}
      </p>

    </button>
  );
}