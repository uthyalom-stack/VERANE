"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const BRAND_INFO = {
  UTHY: {
    name: "UTHY LUXURY",
    shortName: "UTHY",
    accent: "amber",
  },
  ALOMZIEE: {
    name: "ALOMZIEE FOOTIES",
    shortName: "ALOMZIEE",
    accent: "violet",
  },
};

const RANGES = [
  { value: "today", label: "Today" },
  { value: "7d", label: "7 Days" },
  { value: "30d", label: "30 Days" },
  { value: "90d", label: "90 Days" },
  { value: "1y", label: "1 Year" },
];

function normalizeBrand(value) {
  if (!value) return "";

  const brand = String(value)
    .trim()
    .toUpperCase();

  if (
    brand === "UTHY" ||
    brand === "UTHY_LUXURY"
  ) {
    return "UTHY";
  }

  if (
    brand === "ALOMZIEE" ||
    brand === "ALOMZIEE_FOOTIES"
  ) {
    return "ALOMZIEE";
  }

  return brand;
}

function formatMoney(value) {
  const number = Number(value) || 0;

  return `₦${number.toLocaleString("en-NG", {
    maximumFractionDigits: 0,
  })}`;
}

function formatNumber(value) {
  return (Number(value) || 0).toLocaleString(
    "en-NG"
  );
}

function formatDate(value) {
  if (!value) return "—";

  return new Date(value).toLocaleDateString(
    "en-NG",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    }
  );
}

function statusLabel(status) {
  if (!status) return "Unknown";

  return String(status)
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}

function StatCard({
  label,
  value,
  description,
  icon,
}) {
  return (
    <div className="rounded-[1.75rem] border border-white/[0.08] bg-white/[0.025] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[9px] uppercase tracking-[0.25em] text-neutral-600 font-bold">
            {label}
          </p>

          <p className="text-2xl sm:text-3xl font-black tracking-[-0.04em] mt-3">
            {value}
          </p>

          {description && (
            <p className="text-[10px] text-neutral-600 mt-2">
              {description}
            </p>
          )}
        </div>

        <div className="w-10 h-10 rounded-xl border border-white/[0.07] bg-black flex items-center justify-center text-sm text-neutral-400">
          {icon}
        </div>
      </div>
    </div>
  );
}

function Section({
  eyebrow,
  title,
  children,
  className = "",
}) {
  return (
    <section
      className={`rounded-[2rem] border border-white/[0.08] bg-white/[0.025] overflow-hidden ${className}`}
    >
      <div className="p-6 border-b border-white/[0.06]">
        <p className="text-[9px] uppercase tracking-[0.25em] text-neutral-600 font-bold">
          {eyebrow}
        </p>

        <h2 className="text-xl font-black mt-1">
          {title}
        </h2>
      </div>

      {children}
    </section>
  );
}

function MiniBar({
  value,
  max,
}) {
  const percentage =
    max > 0
      ? Math.max(
          4,
          Math.min(
            100,
            (Number(value) / max) * 100
          )
        )
      : 4;

  return (
    <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
      <div
        className="h-full rounded-full bg-emerald-400"
        style={{
          width: `${percentage}%`,
        }}
      />
    </div>
  );
}

function RevenueChart({ daily }) {
  const safeDaily = Array.isArray(daily)
    ? daily
    : [];

  const maxRevenue = Math.max(
    ...safeDaily.map(
      (item) => Number(item.revenue) || 0
    ),
    1
  );

  if (safeDaily.length === 0) {
    return (
      <div className="h-72 flex items-center justify-center text-sm text-neutral-600">
        No analytics available for this period.
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="h-64 flex items-end gap-1 sm:gap-2">
        {safeDaily.map(
          (item, index) => {
            const revenue =
              Number(item.revenue) || 0;

            const height =
              revenue > 0
                ? Math.max(
                    5,
                    (revenue /
                      maxRevenue) *
                      100
                  )
                : 2;

            return (
              <div
                key={`${item.date}-${index}`}
                className="flex-1 h-full flex flex-col justify-end group relative"
              >
                <div
                  className="w-full rounded-t-md bg-emerald-400/70 hover:bg-emerald-300 transition"
                  style={{
                    height: `${height}%`,
                  }}
                  title={`${item.label}: ${formatMoney(
                    revenue
                  )}`}
                />
              </div>
            );
          }
        )}
      </div>

      <div className="flex justify-between gap-3 mt-4 text-[9px] text-neutral-600 uppercase tracking-wider">
        <span>
          {safeDaily[0]?.label || ""}
        </span>

        <span>
          {safeDaily[
            safeDaily.length - 1
          ]?.label || ""}
        </span>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const router = useRouter();

  const [admin, setAdmin] = useState(null);
  const [analytics, setAnalytics] =
    useState(null);

  const [range, setRange] =
    useState("30d");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  async function loadAnalytics(
    selectedRange = range
  ) {
    try {
      setLoading(true);
      setError("");

      const sessionResponse =
        await fetch(
          "/api/admin/session",
          {
            cache: "no-store",
            credentials: "include",
          }
        );

      const sessionData =
        await sessionResponse
          .json()
          .catch(() => null);

      if (
        !sessionResponse.ok ||
        !sessionData?.admin
      ) {
        router.replace("/admin/login");
        return;
      }

      const currentAdmin =
        sessionData.admin;

      const brand =
        normalizeBrand(
          currentAdmin.role
        );

      if (
        brand !== "UTHY" &&
        brand !== "ALOMZIEE"
      ) {
        setError(
          "Analytics are only available to UTHY and ALOMZIEE administrators."
        );

        setLoading(false);
        return;
      }

      setAdmin(currentAdmin);

      const response =
        await fetch(
          `/api/admin/analytics?range=${encodeURIComponent(
            selectedRange
          )}&brand=${encodeURIComponent(
            brand
          )}`,
          {
            cache: "no-store",
            credentials: "include",
          }
        );

      const data =
        await response
          .json()
          .catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Failed to load analytics."
        );
      }

      setAnalytics(data);
    } catch (err) {
      console.error(
        "ANALYTICS PAGE ERROR:",
        err
      );

      setError(
        err?.message ||
          "Failed to load analytics."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAnalytics("30d");
  }, []);

  function changeRange(value) {
    setRange(value);
    loadAnalytics(value);
  }

  const brand =
    normalizeBrand(admin?.role);

  const brandInfo =
    BRAND_INFO[brand] || {
      name: brand || "VÉRANE",
      shortName: brand || "VÉRANE",
      accent: "emerald",
    };

  const overview =
    analytics?.overview || {};

  const analyticsData =
    analytics?.analytics || {};

  const bestSellers =
    analyticsData.bestSellers || [];

  const topCategories =
    analyticsData.topCategories || [];

  const topCollections =
    analyticsData.topCollections || [];

  const orderStatuses =
    analyticsData.orderStatuses || [];

  const daily =
    analyticsData.daily || [];

  const lowStock =
    analytics?.inventory?.lowStock || [];

  const recentOrders =
    analytics?.recentOrders || [];

  const totalCategoryRevenue =
    Math.max(
      ...topCategories.map(
        (item) =>
          Number(item.revenue) || 0
      ),
      1
    );

  const totalCollectionRevenue =
    Math.max(
      ...topCollections.map(
        (item) =>
          Number(item.revenue) || 0
      ),
      1
    );

  const totalStatusOrders =
    Math.max(
      ...orderStatuses.map(
        (item) =>
          Number(item.count) || 0
      ),
      1
    );

  const inventoryHealth =
    useMemo(() => {
      const total =
        Number(
          overview.products
        ) || 0;

      const active =
        Number(
          overview.activeProducts
        ) || 0;

      if (total === 0) return 0;

      return Math.round(
        (active / total) * 100
      );
    }, [
      overview.products,
      overview.activeProducts,
    ]);

  if (loading && !analytics) {
    return (
      <main className="min-h-screen bg-[#070707] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.05] flex items-center justify-center mx-auto">
            <span className="text-emerald-400 font-black">
              V
            </span>
          </div>

          <p className="mt-5 text-[10px] uppercase tracking-[0.3em] text-neutral-600">
            Loading analytics
          </p>
        </div>
      </main>
    );
  }

  if (error && !analytics) {
    return (
      <main className="min-h-screen bg-[#070707] text-white">
        <div className="max-w-[1450px] mx-auto px-5 sm:px-8 py-10">
          <button
            type="button"
            onClick={() =>
              router.push("/admin")
            }
            className="text-[10px] uppercase tracking-[0.2em] text-neutral-600 hover:text-white transition"
          >
            ← Back to Dashboard
          </button>

          <div className="mt-10 rounded-[2rem] border border-red-500/20 bg-red-500/[0.04] p-8">
            <p className="text-sm text-red-300">
              {error}
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#070707] text-white">
      <div className="max-w-[1450px] mx-auto px-5 sm:px-8 py-8 md:py-12">

        {/* HEADER */}

        <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-7 mb-10">

          <div>
            <button
              type="button"
              onClick={() =>
                router.push("/admin")
              }
              className="text-[10px] uppercase tracking-[0.2em] text-neutral-600 hover:text-white transition"
            >
              ← Back to Dashboard
            </button>

            <p className="text-[9px] uppercase tracking-[0.35em] text-emerald-400 font-bold mt-6">
              {brandInfo.name}
            </p>

            <h1 className="text-4xl md:text-6xl font-black tracking-[-0.05em] mt-2">
              Analytics.
            </h1>

            <p className="text-sm text-neutral-500 mt-3 max-w-2xl leading-relaxed">
              Real store performance for{" "}
              <strong className="text-white">
                {brandInfo.name}
              </strong>
              . Revenue, orders, products,
              inventory and customer activity.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-1 flex">
              {RANGES.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() =>
                    changeRange(
                      item.value
                    )
                  }
                  className={`px-4 py-2.5 rounded-xl text-[9px] uppercase tracking-[0.12em] font-bold transition ${
                    range === item.value
                      ? "bg-white text-black"
                      : "text-neutral-500 hover:text-white"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() =>
                loadAnalytics(range)
              }
              disabled={loading}
              className="rounded-2xl border border-white/10 bg-white/[0.025] px-5 py-3 text-[10px] uppercase tracking-[0.15em] font-bold text-neutral-400 hover:text-white transition disabled:opacity-50"
            >
              {loading
                ? "Refreshing..."
                : "Refresh"}
            </button>
          </div>
        </div>

        {/* ERROR */}

        {error && (
          <div className="mb-5 rounded-2xl border border-red-500/20 bg-red-500/[0.05] px-5 py-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* OVERVIEW */}

        <section className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            label="Revenue"
            value={formatMoney(
              overview.revenue
            )}
            description={`Selected period`}
            icon="₦"
          />

          <StatCard
            label="Orders"
            value={formatNumber(
              overview.orders
            )}
            description="Valid orders"
            icon="↗"
          />

          <StatCard
            label="Units Sold"
            value={formatNumber(
              overview.unitsSold
            )}
            description="Products sold"
            icon="◆"
          />

          <StatCard
            label="Average Order"
            value={formatMoney(
              overview.averageOrderValue
            )}
            description="Revenue per order"
            icon="◌"
          />

          <StatCard
            label="Customers"
            value={formatNumber(
              overview.customers
            )}
            description="Unique customers"
            icon="◎"
          />

          <StatCard
            label="Products"
            value={formatNumber(
              overview.products
            )}
            description="Total catalog"
            icon="□"
          />

          <StatCard
            label="Inventory Value"
            value={formatMoney(
              overview.inventoryValue
            )}
            description="Current stock value"
            icon="◇"
          />

          <StatCard
            label="Out of Stock"
            value={formatNumber(
              overview.outOfStock
            )}
            description="Products unavailable"
            icon="!"
          />
        </section>

        {/* REVENUE */}

        <div className="mt-5">
          <Section
            eyebrow="Performance"
            title="Revenue Over Time"
          >
            <RevenueChart daily={daily} />
          </Section>
        </div>

        {/* PRODUCT + CATEGORY */}

        <div className="grid lg:grid-cols-2 gap-5 mt-5">

          <Section
            eyebrow="Products"
            title="Best Sellers"
          >
            <div className="p-5">
              {bestSellers.length ===
              0 ? (
                <div className="py-10 text-center text-sm text-neutral-600">
                  No product sales in
                  this period.
                </div>
              ) : (
                <div className="space-y-4">
                  {bestSellers.map(
                    (
                      product,
                      index
                    ) => (
                      <div
                        key={
                          product.id
                        }
                        className="flex items-center gap-4"
                      >
                        <div className="w-7 h-7 rounded-lg bg-black border border-white/[0.07] flex items-center justify-center text-[10px] font-black text-neutral-500">
                          {index + 1}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between gap-4">
                            <p className="text-xs font-bold truncate">
                              {
                                product.name
                              }
                            </p>

                            <p className="text-[10px] text-neutral-500 whitespace-nowrap">
                              {formatNumber(
                                product.unitsSold
                              )}{" "}
                              sold
                            </p>
                          </div>

                          <p className="text-[10px] text-neutral-600 mt-1">
                            {formatMoney(
                              product.revenue
                            )}
                          </p>

                          <div className="mt-2">
                            <MiniBar
                              value={
                                product.unitsSold
                              }
                              max={
                                Math.max(
                                  ...bestSellers.map(
                                    (
                                      item
                                    ) =>
                                      Number(
                                        item.unitsSold
                                      ) ||
                                      0
                                  ),
                                  1
                                )
                              }
                            />
                          </div>
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          </Section>

          <Section
            eyebrow="Categories"
            title="Top Categories"
          >
            <div className="p-5">
              {topCategories.length ===
              0 ? (
                <div className="py-10 text-center text-sm text-neutral-600">
                  No category sales in
                  this period.
                </div>
              ) : (
                <div className="space-y-5">
                  {topCategories.map(
                    (category) => (
                      <div
                        key={
                          category.name
                        }
                      >
                        <div className="flex justify-between gap-4 mb-2">
                          <p className="text-xs font-bold">
                            {
                              category.name
                            }
                          </p>

                          <p className="text-[10px] text-neutral-500">
                            {formatMoney(
                              category.revenue
                            )}
                          </p>
                        </div>

                        <MiniBar
                          value={
                            category.revenue
                          }
                          max={
                            totalCategoryRevenue
                          }
                        />

                        <p className="text-[9px] text-neutral-700 mt-1">
                          {formatNumber(
                            category.unitsSold
                          )}{" "}
                          units
                        </p>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          </Section>

        </div>

        {/* COLLECTIONS + STATUS */}

        <div className="grid lg:grid-cols-2 gap-5 mt-5">

          <Section
            eyebrow="Collections"
            title="Collection Performance"
          >
            <div className="p-5">
              {topCollections.length ===
              0 ? (
                <div className="py-10 text-center text-sm text-neutral-600">
                  No collection sales in
                  this period.
                </div>
              ) : (
                <div className="space-y-5">
                  {topCollections.map(
                    (collection) => (
                      <div
                        key={
                          collection.name
                        }
                      >
                        <div className="flex justify-between gap-4 mb-2">
                          <p className="text-xs font-bold">
                            {
                              collection.name
                            }
                          </p>

                          <p className="text-[10px] text-neutral-500">
                            {formatMoney(
                              collection.revenue
                            )}
                          </p>
                        </div>

                        <MiniBar
                          value={
                            collection.revenue
                          }
                          max={
                            totalCollectionRevenue
                          }
                        />

                        <p className="text-[9px] text-neutral-700 mt-1">
                          {formatNumber(
                            collection.unitsSold
                          )}{" "}
                          units
                        </p>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          </Section>

          <Section
            eyebrow="Orders"
            title="Order Status"
          >
            <div className="p-5">
              {orderStatuses.length ===
              0 ? (
                <div className="py-10 text-center text-sm text-neutral-600">
                  No orders in this
                  period.
                </div>
              ) : (
                <div className="space-y-4">
                  {orderStatuses.map(
                    (item) => (
                      <div
                        key={
                          item.status
                        }
                      >
                        <div className="flex items-center justify-between gap-4 mb-2">
                          <p className="text-xs font-bold">
                            {statusLabel(
                              item.status
                            )}
                          </p>

                          <p className="text-[10px] text-neutral-500">
                            {formatNumber(
                              item.count
                            )}
                          </p>
                        </div>

                        <MiniBar
                          value={
                            item.count
                          }
                          max={
                            totalStatusOrders
                          }
                        />
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          </Section>

        </div>

        {/* INVENTORY */}

        <div className="grid lg:grid-cols-2 gap-5 mt-5">

          <Section
            eyebrow="Inventory"
            title="Stock Health"
          >
            <div className="p-6">

              <div className="flex items-end justify-between gap-5">
                <div>
                  <p className="text-4xl font-black">
                    {inventoryHealth}%
                  </p>

                  <p className="text-[10px] uppercase tracking-[0.15em] text-neutral-600 mt-2">
                    Products currently in stock
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-sm font-black text-red-300">
                    {formatNumber(
                      overview.outOfStock
                    )}
                  </p>

                  <p className="text-[9px] uppercase tracking-wider text-neutral-700 mt-1">
                    Out of stock
                  </p>
                </div>
              </div>

              <div className="mt-6 h-2 rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-400"
                  style={{
                    width: `${inventoryHealth}%`,
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3 mt-5">
                <div className="rounded-2xl bg-black border border-white/[0.06] p-4">
                  <p className="text-[9px] uppercase tracking-wider text-neutral-600">
                    Low Stock
                  </p>

                  <p className="text-xl font-black mt-2">
                    {formatNumber(
                      overview.lowStock
                    )}
                  </p>
                </div>

                <div className="rounded-2xl bg-black border border-white/[0.06] p-4">
                  <p className="text-[9px] uppercase tracking-wider text-neutral-600">
                    Stock Value
                  </p>

                  <p className="text-xl font-black mt-2">
                    {formatMoney(
                      overview.inventoryValue
                    )}
                  </p>
                </div>
              </div>
            </div>
          </Section>

          <Section
            eyebrow="Attention"
            title="Low Stock"
          >
            <div className="p-5">
              {lowStock.length ===
              0 ? (
                <div className="py-10 text-center">
                  <p className="text-sm font-bold text-emerald-300">
                    Inventory looks good.
                  </p>

                  <p className="text-[10px] text-neutral-700 mt-2">
                    No products are currently
                    below the low-stock threshold.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {lowStock.map(
                    (product) => (
                      <div
                        key={
                          product.id
                        }
                        className="flex items-center justify-between gap-4 rounded-2xl border border-white/[0.06] bg-black/30 px-4 py-3"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate">
                            {
                              product.name
                            }
                          </p>

                          <p className="text-[10px] text-neutral-600 mt-1">
                            {formatMoney(
                              product.price
                            )}
                          </p>
                        </div>

                        <div
                          className={`shrink-0 rounded-full px-3 py-1 text-[9px] font-black uppercase ${
                            Number(
                              product.inventory
                            ) <= 0
                              ? "bg-red-500/10 text-red-300"
                              : "bg-amber-400/10 text-amber-300"
                          }`}
                        >
                          {Number(
                            product.inventory
                          ) <= 0
                            ? "Out"
                            : `${product.inventory} left`}
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          </Section>

        </div>

        {/* RECENT ORDERS */}

        <div className="mt-5">
          <Section
            eyebrow="Latest Activity"
            title="Recent Orders"
          >
            <div className="overflow-x-auto">
              {recentOrders.length ===
              0 ? (
                <div className="p-10 text-center text-sm text-neutral-600">
                  No orders found for this
                  period.
                </div>
              ) : (
                <table className="w-full min-w-[700px]">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      <th className="px-6 py-4 text-left text-[9px] uppercase tracking-[0.15em] text-neutral-700">
                        Order
                      </th>

                      <th className="px-6 py-4 text-left text-[9px] uppercase tracking-[0.15em] text-neutral-700">
                        Customer
                      </th>

                      <th className="px-6 py-4 text-left text-[9px] uppercase tracking-[0.15em] text-neutral-700">
                        Units
                      </th>

                      <th className="px-6 py-4 text-left text-[9px] uppercase tracking-[0.15em] text-neutral-700">
                        Total
                      </th>

                      <th className="px-6 py-4 text-left text-[9px] uppercase tracking-[0.15em] text-neutral-700">
                        Status
                      </th>

                      <th className="px-6 py-4 text-left text-[9px] uppercase tracking-[0.15em] text-neutral-700">
                        Date
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {recentOrders.map(
                      (order) => (
                        <tr
                          key={order.id}
                          className="border-b border-white/[0.04] last:border-0"
                        >
                          <td className="px-6 py-4">
                            <p className="text-xs font-black">
                              #
                              {String(
                                order.id
                              ).slice(
                                -8
                              ).toUpperCase()}
                            </p>
                          </td>

                          <td className="px-6 py-4">
                            <p className="text-xs font-bold">
                              {
                                order
                                  .customer
                                  ?.name
                              }
                            </p>

                            <p className="text-[9px] text-neutral-700 mt-1">
                              {
                                order
                                  .customer
                                  ?.email
                              }
                            </p>
                          </td>

                          <td className="px-6 py-4 text-xs text-neutral-400">
                            {formatNumber(
                              order.units
                            )}
                          </td>

                          <td className="px-6 py-4 text-xs font-black">
                            {formatMoney(
                              order.total
                            )}
                          </td>

                          <td className="px-6 py-4">
                            <span className="inline-flex rounded-full border border-white/[0.07] bg-white/[0.025] px-3 py-1 text-[9px] uppercase tracking-wider font-bold text-neutral-400">
                              {statusLabel(
                                order.status
                              )}
                            </span>
                          </td>

                          <td className="px-6 py-4 text-[10px] text-neutral-600">
                            {formatDate(
                              order.createdAt
                            )}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </Section>
        </div>

        {/* FOOTER INFO */}

        <div className="mt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-[9px] uppercase tracking-[0.15em] text-neutral-700">
          <span>
            {brandInfo.name} · Private Analytics
          </span>

          <span>
            Data generated{" "}
            {analytics?.generatedAt
              ? formatDate(
                  analytics.generatedAt
                )
              : "—"}
          </span>
        </div>

      </div>
    </main>
  );
}