"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  RevenueTrendChart,
  OrdersBarChart,
  BestSellersChart,
  CategoryDonutChart,
  OrderStatusChart,
} from "@/components/admin/AnalyticsCharts";

export default function AdminAnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("30d");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAnalytics();
  }, [range]);

  async function fetchAnalytics(customStart = startDate, customEnd = endDate) {
    setLoading(true);
    setError(null);
    try {
      let url = `/api/admin/analytics?range=${range}`;
      if (range === "custom" && customStart && customEnd) {
        url += `&startDate=${customStart}&endDate=${customEnd}`;
      }

      const res = await fetch(url);
      const json = await res.json();

      if (res.ok && json.success) {
        setData(json);
      } else {
        setError(json.error || "Failed to load analytics");
      }
    } catch (err) {
      console.error("Analytics fetch error:", err);
      setError("An error occurred while loading analytics.");
    } finally {
      setLoading(false);
    }
  }

  function handleCustomSubmit(e) {
    e.preventDefault();
    if (!startDate || !endDate) return;
    setRange("custom");
    setShowCustomModal(false);
    fetchAnalytics(startDate, endDate);
  }

  function formatMoney(amount) {
    return (
      "₦" +
      Number(amount || 0).toLocaleString("en-NG", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })
    );
  }

  function formatNumber(num) {
    return Number(num || 0).toLocaleString("en-NG");
  }

  const brandTitle =
    data?.brand === "UTHY"
      ? "UTHY LUXURY Analytics"
      : data?.brand === "ALOMZIEE"
      ? "ALOMZIEE FOOTIES Analytics"
      : "Store Analytics";

  const isUthy = data?.brand === "UTHY";

  return (
    <main className="min-h-screen bg-black text-white p-4 sm:p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* ======================================================
            HEADER & RANGE SELECTOR
        ====================================================== */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between border-b border-white/10 pb-6 gap-6">
          <div>
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-neutral-500 hover:text-amber-400 transition mb-2"
            >
              ← Back to Admin
            </Link>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
              {brandTitle}
            </h1>
            <p className="text-xs text-neutral-400 mt-1">
              Real-time store performance, revenue metrics, customer acquisition, and inventory intelligence.
            </p>
          </div>

          {/* FILTER CONTROLS */}
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: "today", label: "Today" },
              { id: "7d", label: "7 Days" },
              { id: "30d", label: "30 Days" },
              { id: "90d", label: "90 Days" },
              { id: "1y", label: "1 Year" },
            ].map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  setRange(r.id);
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition ${
                  range === r.id
                    ? isUthy
                      ? "bg-amber-400 text-black shadow-lg shadow-amber-400/20"
                      : "bg-violet-300 text-black shadow-lg shadow-violet-300/20"
                    : "border border-white/10 bg-neutral-900/60 text-neutral-400 hover:text-white hover:border-white/20"
                }`}
              >
                {r.label}
              </button>
            ))}

            <button
              type="button"
              onClick={() => setShowCustomModal(true)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition ${
                range === "custom"
                  ? isUthy
                    ? "bg-amber-400 text-black"
                    : "bg-violet-300 text-black"
                  : "border border-white/10 bg-neutral-900/60 text-neutral-400 hover:text-white hover:border-white/20"
              }`}
            >
              Custom
            </button>
          </div>
        </div>

        {/* CUSTOM RANGE MODAL */}
        {showCustomModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-2xl border border-white/10 bg-neutral-950 p-6 shadow-2xl space-y-5">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <h3 className="text-sm font-black uppercase tracking-wider text-amber-400">
                  Select Custom Date Range
                </h3>
                <button
                  type="button"
                  onClick={() => setShowCustomModal(false)}
                  className="text-neutral-500 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCustomSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                    className="w-full rounded-xl border border-white/10 bg-neutral-900 px-4 py-2.5 text-xs text-white focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs text-neutral-400 mb-1">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                    className="w-full rounded-xl border border-white/10 bg-neutral-900 px-4 py-2.5 text-xs text-white focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCustomModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-neutral-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-amber-400 px-5 py-2 text-xs font-bold text-black hover:bg-amber-300"
                  >
                    Apply Range
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ERROR SCREEN */}
        {error ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-red-400 text-xs">
            {error}
          </div>
        ) : loading ? (
          /* LOADING SCREEN */
          <div className="py-20 text-center space-y-4">
            <div className="w-8 h-8 rounded-full border-2 border-amber-400 border-t-transparent animate-spin mx-auto" />
            <p className="text-xs uppercase tracking-widest text-neutral-500">
              Generating store analytics...
            </p>
          </div>
        ) : data?.overview ? (
          <>
            {/* ======================================================
                PRIMARY KPI CARDS (8 CARDS GRID)
            ====================================================== */}
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard
                label="Total Revenue"
                value={formatMoney(data.overview.revenue)}
                subtitle="Net paid order volume"
                accent={isUthy ? "amber" : "violet"}
              />

              <KpiCard
                label="Total Orders"
                value={formatNumber(data.overview.orders)}
                subtitle="Completed store sales"
                accent={isUthy ? "amber" : "violet"}
              />

              <KpiCard
                label="Avg Order Value"
                value={formatMoney(data.overview.averageOrderValue)}
                subtitle="Average basket total"
                accent={isUthy ? "amber" : "violet"}
              />

              <KpiCard
                label="Units Sold"
                value={formatNumber(data.overview.unitsSold)}
                subtitle="Total items fulfilled"
                accent={isUthy ? "amber" : "violet"}
              />

              <KpiCard
                label="Active Products"
                value={formatNumber(data.overview.products)}
                subtitle={`${data.overview.activeProducts} with stock`}
              />

              <KpiCard
                label="Inventory Valuation"
                value={formatMoney(data.overview.inventoryValue)}
                subtitle={`${formatNumber(data.overview.totalInventoryUnits)} units in warehouse`}
              />

              <KpiCard
                label="Low Stock Items"
                value={formatNumber(data.overview.lowStock)}
                subtitle="Products with ≤ 5 stock"
                alert={data.overview.lowStock > 0 ? "orange" : null}
              />

              <KpiCard
                label="Out of Stock"
                value={formatNumber(data.overview.outOfStock)}
                subtitle="Stock health: "
                stockHealth={data.overview.stockHealth}
                alert={data.overview.outOfStock > 0 ? "red" : null}
              />
            </div>

            {/* ======================================================
                CHARTS SECTION - ROW 1: REVENUE TREND & ORDERS
            ====================================================== */}
            <div className="grid lg:grid-cols-3 gap-6">
              {/* REVENUE & AOV TREND (2 COLS) */}
              <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-neutral-950 p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-black">Revenue & AOV Trend</h2>
                    <p className="text-[10px] text-neutral-500 uppercase tracking-wider mt-0.5">
                      Daily sales performance over time (WAT)
                    </p>
                  </div>
                </div>

                <RevenueTrendChart data={data.analytics?.daily || []} />
              </div>

              {/* ORDERS VOLUME (1 COL) */}
              <div className="rounded-2xl border border-white/10 bg-neutral-950 p-6 space-y-4">
                <div>
                  <h2 className="text-base font-black">Orders & Volume</h2>
                  <p className="text-[10px] text-neutral-500 uppercase tracking-wider mt-0.5">
                    Order volume per day
                  </p>
                </div>

                <OrdersBarChart data={data.analytics?.daily || []} />
              </div>
            </div>

            {/* ======================================================
                CHARTS SECTION - ROW 2: BEST SELLERS & CATEGORY REVENUE
            ====================================================== */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* TOP PERFORMING PRODUCTS */}
              <div className="rounded-2xl border border-white/10 bg-neutral-950 p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <div>
                    <h2 className="text-base font-black">Best-Selling Products</h2>
                    <p className="text-[10px] text-neutral-500 uppercase tracking-wider mt-0.5">
                      Ranked by generated revenue
                    </p>
                  </div>
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest bg-amber-400/10 px-2.5 py-1 rounded-full">
                    Top 10
                  </span>
                </div>

                <BestSellersChart items={data.analytics?.bestSellers || []} />
              </div>

              {/* CATEGORY PERFORMANCE */}
              <div className="rounded-2xl border border-white/10 bg-neutral-950 p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <div>
                    <h2 className="text-base font-black">Category Breakdown</h2>
                    <p className="text-[10px] text-neutral-500 uppercase tracking-wider mt-0.5">
                      Revenue share by product category
                    </p>
                  </div>
                </div>

                <CategoryDonutChart categories={data.analytics?.topCategories || []} />
              </div>
            </div>

            {/* ======================================================
                CHARTS SECTION - ROW 3: CUSTOMERS & ORDER STATUS & PRE-ORDERS
            ====================================================== */}
            <div className="grid lg:grid-cols-3 gap-6">
              {/* CUSTOMER ACQUISITION BREAKDOWN */}
              <div className="rounded-2xl border border-white/10 bg-neutral-950 p-6 space-y-4">
                <div className="border-b border-white/5 pb-3">
                  <h2 className="text-base font-black">Customer Acquisition</h2>
                  <p className="text-[10px] text-neutral-500 uppercase tracking-wider mt-0.5">
                    Acquisition & retention breakdown
                  </p>
                </div>

                <div className="space-y-3 pt-1">
                  <CustomerMetricRow
                    label="Active Store Customers"
                    value={data.customers?.totalActiveCustomers || 0}
                    subtitle="Buyers in selected period"
                  />
                  <CustomerMetricRow
                    label="First-Time Buyers"
                    value={data.customers?.firstTimeBuyers || 0}
                    subtitle="Placed 1st store order"
                    highlight
                  />
                  <CustomerMetricRow
                    label="Returning Buyers"
                    value={data.customers?.returningBuyers || 0}
                    subtitle="Placed repeat orders"
                  />
                  <CustomerMetricRow
                    label="New Account Registrations"
                    value={data.customers?.newRegistered || 0}
                    subtitle="Signed up in period"
                  />
                </div>
              </div>

              {/* ORDER FULFILLMENT STATUS */}
              <div className="rounded-2xl border border-white/10 bg-neutral-950 p-6 space-y-4">
                <div className="border-b border-white/5 pb-3">
                  <h2 className="text-base font-black">Order Status Distribution</h2>
                  <p className="text-[10px] text-neutral-500 uppercase tracking-wider mt-0.5">
                    Current order fulfillment state
                  </p>
                </div>

                <OrderStatusChart statuses={data.analytics?.orderStatuses || []} />
              </div>

              {/* PRE-ORDER / WAITING LIST DEMAND */}
              <div className="rounded-2xl border border-white/10 bg-neutral-950 p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <div>
                    <h2 className="text-base font-black">Waiting List Demand</h2>
                    <p className="text-[10px] text-neutral-500 uppercase tracking-wider mt-0.5">
                      Pre-order & waitlist signups
                    </p>
                  </div>
                  <span className="text-xs font-bold text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-full">
                    {data.waitingList?.totalRequests || 0} total
                  </span>
                </div>

                {data.waitingList?.topProducts?.length ? (
                  <div className="space-y-3">
                    {data.waitingList.topProducts.map((p) => (
                      <div key={p.id} className="flex items-center justify-between text-xs border-b border-white/5 pb-2.5">
                        <div className="min-w-0 pr-2">
                          <p className="font-bold truncate">{p.name}</p>
                          <p className="text-[10px] text-neutral-500">{formatMoney(p.price)}</p>
                        </div>
                        <span className="px-2.5 py-1 rounded-full bg-amber-400/10 text-amber-400 text-[10px] font-bold">
                          {p.count} waiting
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-neutral-500 py-6 text-center">
                    No waiting list entries for this period.
                  </p>
                )}
              </div>
            </div>

            {/* ======================================================
                TABLES SECTION: LOW STOCK ALERTS & RECENT ORDERS
            ====================================================== */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* LOW STOCK ALERTS */}
              <div className="rounded-2xl border border-white/10 bg-neutral-950 p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <h2 className="text-base font-black">Low Stock Inventory Alerts</h2>
                  <Link href="/admin/products" className="text-[10px] text-amber-400 hover:underline uppercase font-bold tracking-wider">
                    Manage Products →
                  </Link>
                </div>

                {data.inventory?.lowStock?.length ? (
                  <div className="space-y-3">
                    {data.inventory.lowStock.map((item) => (
                      <div key={item.id} className="flex items-center justify-between border-b border-white/5 pb-3">
                        <div className="min-w-0 pr-3">
                          <p className="text-xs font-bold truncate max-w-[240px]">{item.name}</p>
                          <p className="text-[10px] text-neutral-500">{formatMoney(item.price)}</p>
                        </div>
                        <span className="px-3 py-1 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20 text-[10px] font-bold">
                          {item.inventory} left
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-neutral-500 py-6 text-center">
                    All inventory levels are healthy.
                  </p>
                )}
              </div>

              {/* RECENT ORDERS */}
              <div className="rounded-2xl border border-white/10 bg-neutral-950 p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <h2 className="text-base font-black">Recent Orders</h2>
                  <Link href="/admin/orders" className="text-[10px] text-amber-400 hover:underline uppercase font-bold tracking-wider">
                    View Orders →
                  </Link>
                </div>

                {data.recentOrders?.length ? (
                  <div className="space-y-3">
                    {data.recentOrders.map((order) => (
                      <div key={order.id} className="flex items-center justify-between border-b border-white/5 pb-3 text-xs">
                        <div>
                          <p className="font-bold text-white">{order.customer?.name}</p>
                          <p className="text-[10px] text-neutral-500">{new Date(order.createdAt).toLocaleDateString("en-NG", { timeZone: "Africa/Lagos", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-amber-400">{formatMoney(order.total)}</p>
                          <span className="text-[10px] uppercase font-bold text-neutral-400">{order.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-neutral-500 py-6 text-center">
                    No recent orders.
                  </p>
                )}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </main>
  );
}

/* ============================================================
   KPI CARD COMPONENT
============================================================ */

function KpiCard({
  label,
  value,
  subtitle,
  accent,
  alert,
  stockHealth,
}) {
  const isAmber = accent === "amber";

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-neutral-950 p-5 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-neutral-500">
          {label}
        </p>

        {alert && (
          <span
            className={`w-2 h-2 rounded-full ${
              alert === "red" ? "bg-red-500 animate-pulse" : "bg-orange-400"
            }`}
          />
        )}
      </div>

      <p
        className={`text-2xl sm:text-3xl font-black tracking-tight ${
          accent
            ? isAmber
              ? "text-amber-400"
              : "text-violet-300"
            : alert === "red"
            ? "text-red-400"
            : alert === "orange"
            ? "text-orange-400"
            : "text-white"
        }`}
      >
        {value}
      </p>

      <p className="text-[10px] text-neutral-500 truncate">
        {subtitle}
        {stockHealth !== undefined && (
          <span className="font-bold text-emerald-400">{stockHealth}%</span>
        )}
      </p>
    </div>
  );
}

/* ============================================================
   CUSTOMER METRIC ROW
============================================================ */

function CustomerMetricRow({ label, value, subtitle, highlight = false }) {
  return (
    <div
      className={`flex items-center justify-between p-3 rounded-xl border ${
        highlight
          ? "border-amber-400/20 bg-amber-400/[0.04]"
          : "border-white/5 bg-neutral-900/40"
      }`}
    >
      <div>
        <p className="text-xs font-bold text-white">{label}</p>
        <p className="text-[10px] text-neutral-500">{subtitle}</p>
      </div>
      <span
        className={`text-lg font-black ${
          highlight ? "text-amber-400" : "text-white"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
