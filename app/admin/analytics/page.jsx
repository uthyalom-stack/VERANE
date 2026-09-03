"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AnalyticsCharts from "@/components/admin/AnalyticsCharts";

export default function AdminAnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("30d");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (range !== "custom") {
      fetchAnalytics(range);
    }
  }, [range]);

  async function fetchAnalytics(selectedRange, startDate = "", endDate = "") {
    setLoading(true);
    setError(null);
    try {
      let url = `/api/admin/analytics?range=${selectedRange}`;
      if (selectedRange === "custom") {
        if (startDate) url += `&startDate=${startDate}`;
        if (endDate) url += `&endDate=${endDate}`;
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
    if (!customStart) {
      setError("Please select a start date for custom range.");
      return;
    }
    setRange("custom");
    fetchAnalytics("custom", customStart, customEnd);
  }

  function formatMoney(amount) {
    return "₦" + Number(amount || 0).toLocaleString("en-NG");
  }

  function parseFirstImage(imagesString) {
    if (!imagesString) return "/placeholder.png";
    try {
      const parsed = JSON.parse(imagesString);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed[0];
    } catch {
      if (typeof imagesString === "string") return imagesString.split(",")[0].trim();
    }
    return "/placeholder.png";
  }

  const brandTitle =
    data?.brand === "UTHY"
      ? "UTHY LUXURY"
      : data?.brand === "ALOMZIEE"
      ? "ALOMZIEE FOOTIES"
      : "Brand Analytics";

  return (
    <main className="min-h-screen bg-black text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* HEADER & DATE SELECTOR */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between border-b border-white/10 pb-6 gap-6">
          <div>
            <Link
              href="/admin"
              className="text-[10px] uppercase tracking-[0.25em] text-neutral-500 hover:text-white transition"
            >
              ← Back to Control Center
            </Link>
            <h1 className="text-2xl md:text-3xl font-black mt-2 tracking-tight">
              {brandTitle} Overview
            </h1>
            <p className="text-xs text-neutral-400 mt-1 max-w-2xl">
              Brand performance overview centre for revenue, orders, inventory health, and customer activity.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-white/10 bg-neutral-950 p-1.5">
              {[
                { key: "today", label: "Today" },
                { key: "7d", label: "7D" },
                { key: "30d", label: "30D" },
                { key: "90d", label: "90D" },
                { key: "1y", label: "1Y" },
                { key: "custom", label: "Custom" },
              ].map((r) => (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => {
                    if (r.key === "custom") {
                      setShowCustomPicker((prev) => !prev);
                    } else {
                      setShowCustomPicker(false);
                      setRange(r.key);
                    }
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase transition ${
                    range === r.key
                      ? "bg-amber-500 text-black shadow-md"
                      : "text-neutral-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* CUSTOM DATE PICKER */}
        {showCustomPicker && (
          <form
            onSubmit={handleCustomSubmit}
            className="flex flex-col sm:flex-row items-end gap-4 rounded-2xl border border-amber-500/20 bg-neutral-950 p-4"
          >
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-neutral-400 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="rounded-xl border border-white/10 bg-neutral-900 px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-neutral-400 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="rounded-xl border border-white/10 bg-neutral-900 px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="rounded-xl bg-amber-500 px-5 py-2 text-xs font-bold text-black transition hover:bg-amber-400"
            >
              Apply Filter
            </button>
          </form>
        )}

        {/* ERROR / LOADING DISPLAY */}
        {error ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-red-400 text-xs">
            {error}
          </div>
        ) : loading ? (
          <div className="py-20 text-center">
            <p className="text-[10px] uppercase tracking-[0.3em] text-amber-400 animate-pulse">
              VÉRANE ANALYTICS
            </p>
            <p className="text-xs text-neutral-500 mt-2">Loading brand performance metrics...</p>
          </div>
        ) : data?.overview ? (
          <>
            {/* PRIMARY KPI OVERVIEW GRID */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-neutral-500">
                  Financial & Order Performance
                </p>
                <Link
                  href="/admin/analytics/sales"
                  className="text-xs font-bold text-amber-400 hover:text-amber-300 transition flex items-center gap-1"
                >
                  View Detailed Sales Analytics →
                </Link>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="rounded-2xl border border-white/10 bg-neutral-950 p-5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400">Total Revenue</p>
                  <p className="text-xl md:text-2xl font-black mt-2">{formatMoney(data.overview.revenue)}</p>
                  <p className="text-[10px] text-neutral-500 mt-1">Net valid orders</p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-neutral-950 p-5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400">Orders</p>
                  <p className="text-xl md:text-2xl font-black mt-2">{data.overview.orders}</p>
                  <p className="text-[10px] text-neutral-500 mt-1">Completed / Valid</p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-neutral-950 p-5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400">Units Sold</p>
                  <p className="text-xl md:text-2xl font-black mt-2">{data.overview.unitsSold}</p>
                  <p className="text-[10px] text-neutral-500 mt-1">Items dispatched</p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-neutral-950 p-5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400">Avg Order Value</p>
                  <p className="text-xl md:text-2xl font-black mt-2">{formatMoney(data.overview.averageOrderValue)}</p>
                  <p className="text-[10px] text-neutral-500 mt-1">Per valid order</p>
                </div>

                <div className="col-span-2 sm:col-span-1 rounded-2xl border border-white/10 bg-neutral-950 p-5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400">Active Customers</p>
                  <p className="text-xl md:text-2xl font-black mt-2">{data.overview.customers}</p>
                  <p className="text-[10px] text-neutral-500 mt-1">Buyers in period</p>
                </div>
              </div>
            </div>

            {/* REAL INTERACTIVE CHART */}
            <AnalyticsCharts dailyData={data.analytics?.daily || []} />

            {/* INVENTORY SUMMARY KPI STRIP */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-neutral-500 mb-3">
                Catalog & Inventory Health
              </p>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-2xl border border-white/10 bg-neutral-950 p-5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Active Products</p>
                  <p className="text-xl font-bold mt-1.5 text-white">{data.overview.activeProducts} / {data.overview.products}</p>
                  <p className="text-[10px] text-neutral-500 mt-1">{data.overview.stockHealth}% health score</p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-neutral-950 p-5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Inventory Valuation</p>
                  <p className="text-xl font-bold mt-1.5 text-white">{formatMoney(data.overview.inventoryValue)}</p>
                  <p className="text-[10px] text-neutral-500 mt-1">{data.overview.totalInventoryUnits} total units in stock</p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-neutral-950 p-5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Low Stock Items</p>
                  <p className="text-xl font-bold mt-1.5 text-orange-400">{data.overview.lowStock}</p>
                  <p className="text-[10px] text-neutral-500 mt-1">1–5 units remaining</p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-neutral-950 p-5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Out of Stock</p>
                  <p className="text-xl font-bold mt-1.5 text-red-400">{data.overview.outOfStock}</p>
                  <p className="text-[10px] text-neutral-500 mt-1">Requires re-stocking</p>
                </div>
              </div>
            </div>

            {/* PREVIEW CARDS GRID */}
            <div className="grid lg:grid-cols-2 gap-6">

              {/* BEST SELLERS PREVIEW */}
              <div className="rounded-2xl border border-white/10 bg-neutral-950 p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-base font-bold text-white">Best Selling Products</h2>
                      <p className="text-[11px] text-neutral-400">Top revenue generating items</p>
                    </div>
                  </div>

                  {data.analytics?.bestSellers?.length ? (
                    <div className="space-y-3.5">
                      {data.analytics.bestSellers.slice(0, 5).map((item, i) => (
                        <div key={item.id} className="flex items-center justify-between border-b border-white/5 pb-3">
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-bold text-amber-400 w-4">{i + 1}.</span>
                            <div>
                              <p className="text-xs font-bold text-white truncate max-w-[200px] sm:max-w-[280px]">{item.name}</p>
                              <p className="text-[10px] text-neutral-500">{item.unitsSold} units sold</p>
                            </div>
                          </div>
                          <p className="text-xs font-black text-amber-400">{formatMoney(item.revenue)}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-neutral-500 py-6">No sales recorded for this period.</p>
                  )}
                </div>

                <div className="mt-6 pt-4 border-t border-white/5 flex justify-end">
                  <Link
                    href="/admin/analytics/products"
                    className="text-xs font-bold text-amber-400 hover:text-amber-300 transition flex items-center gap-1"
                  >
                    View Best Sellers & Product Analytics →
                  </Link>
                </div>
              </div>

              {/* CUSTOMER ANALYTICS PREVIEW */}
              <div className="rounded-2xl border border-white/10 bg-neutral-950 p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-base font-bold text-white">Customer Breakdown</h2>
                      <p className="text-[11px] text-neutral-400">Customer acquisition and retention</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 my-4">
                    <div className="rounded-xl border border-white/5 bg-neutral-900/60 p-4 text-center">
                      <p className="text-[10px] uppercase font-bold tracking-wider text-neutral-400">New Signups</p>
                      <p className="text-xl font-black text-white mt-1">{data.overview.newCustomers || 0}</p>
                    </div>
                    <div className="rounded-xl border border-white/5 bg-neutral-900/60 p-4 text-center">
                      <p className="text-[10px] uppercase font-bold tracking-wider text-neutral-400">First-Time</p>
                      <p className="text-xl font-black text-amber-400 mt-1">{data.overview.firstTimeBuyers || 0}</p>
                    </div>
                    <div className="rounded-xl border border-white/5 bg-neutral-900/60 p-4 text-center">
                      <p className="text-[10px] uppercase font-bold tracking-wider text-neutral-400">Returning</p>
                      <p className="text-xl font-black text-white mt-1">{data.overview.returningBuyers || 0}</p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/5 bg-neutral-900/30 p-4 text-xs text-neutral-400 space-y-1">
                    <p className="flex justify-between">
                      <span>Total Purchasing Customers:</span>
                      <strong className="text-white">{data.overview.customers}</strong>
                    </p>
                    <p className="flex justify-between">
                      <span>Repeat Purchase Rate:</span>
                      <strong className="text-amber-400">
                        {data.overview.customers > 0
                          ? Math.round(((data.overview.returningBuyers || 0) / data.overview.customers) * 100)
                          : 0}%
                      </strong>
                    </p>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-white/5 flex justify-end">
                  <span className="text-xs font-bold text-neutral-500 cursor-default flex items-center gap-1">
                    View Customer Analytics <span className="text-[10px] text-neutral-600">(Phase 1B)</span> →
                  </span>
                </div>
              </div>

              {/* INVENTORY PREVIEW */}
              <div className="rounded-2xl border border-white/10 bg-neutral-950 p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-base font-bold text-white">Stock & Inventory Alerts</h2>
                      <p className="text-[11px] text-neutral-400">Low inventory and out of stock items</p>
                    </div>
                  </div>

                  {data.inventory?.lowStock?.length ? (
                    <div className="space-y-3">
                      {data.inventory.lowStock.slice(0, 4).map((item) => (
                        <div key={item.id} className="flex items-center justify-between border-b border-white/5 pb-2.5">
                          <div>
                            <p className="text-xs font-bold text-white truncate max-w-[200px]">{item.name}</p>
                            <p className="text-[10px] text-neutral-500">{formatMoney(item.price)}</p>
                          </div>
                          <span className="px-2.5 py-1 rounded-full bg-orange-500/10 text-orange-400 text-[10px] font-bold">
                            {item.inventory} left
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-neutral-500 py-6">All active products have adequate stock levels.</p>
                  )}
                </div>

                <div className="mt-6 pt-4 border-t border-white/5 flex justify-end">
                  <Link
                    href="/admin/analytics/categories"
                    className="text-xs font-bold text-amber-400 hover:text-amber-300 transition flex items-center gap-1"
                  >
                    View Category & Collection Analytics →
                  </Link>
                </div>
              </div>

              {/* DEMAND / WAITING LIST PREVIEW */}
              <div className="rounded-2xl border border-white/10 bg-neutral-950 p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-base font-bold text-white">Demand & Waiting List</h2>
                      <p className="text-[11px] text-neutral-400">Customer restock requests and demand signals</p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/5 bg-neutral-900/60 p-5 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Restock Requests</p>
                      <p className="text-3xl font-black text-amber-400 mt-1">{data.overview.waitingListCount || 0}</p>
                      <p className="text-[10px] text-neutral-500 mt-1">Waiting customers for sold out products</p>
                    </div>
                    <div className="text-right text-xs text-neutral-400">
                      <p>High demand alert</p>
                      <span className="inline-block mt-2 px-3 py-1 rounded-full bg-amber-400/10 text-amber-400 text-[10px] font-bold">
                        {data.overview.outOfStock} items out of stock
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-white/5 flex justify-end">
                  <span className="text-xs font-bold text-neutral-500 cursor-default flex items-center gap-1">
                    View Demand Analytics <span className="text-[10px] text-neutral-600">(Phase 1B)</span> →
                  </span>
                </div>
              </div>

            </div>

            {/* MARKETING PREVIEW PLACEHOLDER */}
            <div className="rounded-2xl border border-white/10 bg-neutral-950/50 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-neutral-400">Marketing & Campaign Attribution</h3>
                  <p className="text-[11px] text-neutral-600 mt-0.5">
                    Link tracking, campaign traffic, and sales conversion attribution framework
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full border border-white/10 text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
                  Upcoming Module
                </span>
              </div>
            </div>

          </>
        ) : null}
      </div>
    </main>
  );
}
