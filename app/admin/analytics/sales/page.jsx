"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AreaTrendChart, VerticalColumnChart } from "@/components/admin/AnalyticsCharts";

export default function SalesAnalyticsPage() {
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
        setError(json.error || "Failed to load sales analytics");
      }
    } catch (err) {
      console.error("Sales analytics fetch error:", err);
      setError("An error occurred while loading sales analytics.");
    } finally {
      setLoading(false);
    }
  }

  function handleCustomSubmit(e) {
    e.preventDefault();
    if (!customStart) {
      setError("Please select a start date.");
      return;
    }
    setRange("custom");
    fetchAnalytics("custom", customStart, customEnd);
  }

  function formatMoney(amount) {
    return "₦" + Number(amount || 0).toLocaleString("en-NG");
  }

  function renderChangeBadge(val) {
    if (val === null || val === undefined || isNaN(val)) {
      return (
        <span className="text-[10px] text-neutral-500 font-medium">
          No previous comparison data
        </span>
      );
    }
    const isPos = val >= 0;
    return (
      <span
        className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full ${
          isPos
            ? "bg-emerald-500/10 text-emerald-400"
            : "bg-rose-500/10 text-rose-400"
        }`}
      >
        {isPos ? "↑" : "↓"} {Math.abs(val).toFixed(1)}% vs prev period
      </span>
    );
  }

  const brandTitle =
    data?.brand === "UTHY"
      ? "UTHY LUXURY"
      : data?.brand === "ALOMZIEE"
      ? "ALOMZIEE FOOTIES"
      : "Brand Sales";

  const dailyData = data?.analytics?.daily || [];

  return (
    <main className="min-h-screen bg-black text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* HEADER & RANGE SELECTOR */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between border-b border-white/10 pb-6 gap-6">
          <div>
            <Link
              href="/admin/analytics"
              className="text-[10px] uppercase tracking-[0.25em] text-neutral-500 hover:text-white transition"
            >
              ← Back to Analytics Overview
            </Link>
            <h1 className="text-2xl md:text-3xl font-black mt-2 tracking-tight">
              {brandTitle} — Detailed Sales Analytics
            </h1>
            <p className="text-xs text-neutral-400 mt-1 max-w-2xl">
              Visual financial tracking, revenue trends, order column volume, and unit dispatch metrics.
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
              VÉRANE SALES ANALYTICS
            </p>
            <p className="text-xs text-neutral-500 mt-2">Loading visual sales metrics...</p>
          </div>
        ) : data?.overview ? (
          <>
            {/* KPI METRICS WITH SHIFT BADGES */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-white/10 bg-neutral-950 p-5 space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400">Total Revenue</p>
                <p className="text-2xl font-black">{formatMoney(data.overview.revenue)}</p>
                <div>{renderChangeBadge(data.overview.comparisons?.revenueChange)}</div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-neutral-950 p-5 space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400">Valid Orders</p>
                <p className="text-2xl font-black">{data.overview.orders}</p>
                <div>{renderChangeBadge(data.overview.comparisons?.ordersChange)}</div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-neutral-950 p-5 space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400">Units Sold</p>
                <p className="text-2xl font-black">{data.overview.unitsSold}</p>
                <div>{renderChangeBadge(data.overview.comparisons?.unitsChange)}</div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-neutral-950 p-5 space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400">Avg Order Value</p>
                <p className="text-2xl font-black">{formatMoney(data.overview.averageOrderValue)}</p>
                <div>{renderChangeBadge(data.overview.comparisons?.aovChange)}</div>
              </div>
            </div>

            {/* MAIN VISUAL 1: LARGE AREA TREND CHART */}
            <AreaTrendChart
              dailyData={dailyData}
              title="Revenue & Performance Trend Chart"
              subtitle="Line / area visualization over selected date range"
            />

            {/* MAIN VISUAL 2: SIDE-BY-SIDE COLUMN CHARTS */}
            <div className="grid lg:grid-cols-2 gap-6">
              <VerticalColumnChart
                data={dailyData}
                title="Order Volume Column Chart"
                subtitle="Daily order count distribution"
                isCurrency={false}
                valueKey="orders"
              />

              <VerticalColumnChart
                data={dailyData}
                title="Units Dispatched Column Chart"
                subtitle="Daily units sold volume"
                isCurrency={false}
                valueKey="unitsSold"
              />
            </div>

            {/* SUPPORTING CONTEXT: ORDER STATUS & RECENT ORDERS TABLE */}
            <div className="grid lg:grid-cols-3 gap-6">

              {/* ORDER STATUS DISTRIBUTION */}
              <div className="rounded-2xl border border-white/10 bg-neutral-950 p-6 space-y-4">
                <div>
                  <h2 className="text-base font-bold text-white">Order Status Distribution</h2>
                  <p className="text-[11px] text-neutral-400">All brand orders created in range</p>
                </div>

                {data.analytics?.orderStatuses?.length ? (
                  <div className="space-y-3">
                    {data.analytics.orderStatuses.map((st) => (
                      <div key={st.status} className="flex items-center justify-between border-b border-white/5 pb-2.5">
                        <span className="text-xs font-semibold capitalize text-neutral-300">
                          {st.status}
                        </span>
                        <span className="px-3 py-1 rounded-full border border-white/10 bg-neutral-900 text-xs font-bold text-amber-400">
                          {st.count} orders
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-neutral-500 py-6">No order records available.</p>
                )}
              </div>

              {/* RECENT ORDERS TABLE */}
              <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-neutral-950 p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-white">Recent Order Records</h2>
                    <p className="text-[11px] text-neutral-400">Latest valid brand orders in period</p>
                  </div>
                  <Link
                    href="/admin/orders"
                    className="text-xs font-bold text-amber-400 hover:text-amber-300 transition"
                  >
                    Manage Orders →
                  </Link>
                </div>

                {data.recentOrders?.length ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-white/10 text-[10px] uppercase tracking-wider text-neutral-500">
                          <th className="pb-3 font-semibold">Customer</th>
                          <th className="pb-3 font-semibold">Units</th>
                          <th className="pb-3 font-semibold">Status</th>
                          <th className="pb-3 font-semibold text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {data.recentOrders.map((ord) => (
                          <tr key={ord.id} className="hover:bg-white/[0.02]">
                            <td className="py-3 font-medium text-white">
                              {ord.customer?.name || "Customer"}
                              <span className="block text-[10px] text-neutral-500 font-normal">
                                {ord.customer?.email || "No email"}
                              </span>
                            </td>
                            <td className="py-3 text-neutral-300">{ord.units}</td>
                            <td className="py-3">
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold capitalize bg-white/5 text-neutral-300">
                                {ord.status}
                              </span>
                            </td>
                            <td className="py-3 font-bold text-amber-400 text-right">
                              {formatMoney(ord.total)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-neutral-500 py-6">No recent orders found.</p>
                )}
              </div>

            </div>

          </>
        ) : null}
      </div>
    </main>
  );
}
