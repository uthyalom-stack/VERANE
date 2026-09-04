"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AreaTrendChart, VerticalColumnChart, DonutChart } from "@/components/admin/AnalyticsCharts";

/**
 * Display customer analytics for a selected brand and date range, including buyer metrics, trends, and customer details.
 * @returns {JSX.Element} The customer analytics page.
 */
export default function CustomerAnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("30d");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [search, setSearch] = useState("");
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
        setError(json.error || "Failed to load customer analytics");
      }
    } catch (err) {
      console.error("Customer analytics fetch error:", err);
      setError("An error occurred while loading customer analytics.");
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

  function formatDateStr(d) {
    if (!d) return "N/A";
    return new Date(d).toLocaleDateString("en-NG", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  const brandTitle =
    data?.brand === "UTHY"
      ? "UTHY LUXURY"
      : data?.brand === "ALOMZIEE"
      ? "ALOMZIEE FOOTIES"
      : "Brand Customers";

  const dailyData = data?.analytics?.daily || [];
  const customerList = data?.customersData?.list || [];

  const filteredCustomers = customerList.filter(
    (c) =>
      (c.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.email || "").toLowerCase().includes(search.toLowerCase())
  );

  const customerCompositionSlices = [
    { name: "First-Time Buyers", revenue: data?.overview?.firstTimeBuyers || 0 },
    { name: "Returning Buyers", revenue: data?.overview?.returningBuyers || 0 },
  ];

  const purchasingComparisonColumns = [
    { label: "First-Time", val: data?.overview?.firstTimeBuyers || 0 },
    { label: "Returning", val: data?.overview?.returningBuyers || 0 },
  ];

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
              {brandTitle} — Customer Analytics
            </h1>
            <p className="text-xs text-neutral-400 mt-1 max-w-2xl">
              Visual customer acquisition trends, purchasing behavior, order frequency, and buyer retention.
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
              VÉRANE CUSTOMER ANALYTICS
            </p>
            <p className="text-xs text-neutral-500 mt-2">Loading customer behavior metrics...</p>
          </div>
        ) : data?.overview ? (
          <>
            {/* KPI METRICS GRID */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-white/10 bg-neutral-950 p-5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400">Total Buyers</p>
                <p className="text-2xl font-black mt-2">{data.overview.customers}</p>
                <p className="text-[10px] text-neutral-500 mt-1">Purchasing customers</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-neutral-950 p-5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400">New Account Signups</p>
                <p className="text-2xl font-black mt-2">{data.overview.newCustomers || 0}</p>
                <p className="text-[10px] text-neutral-500 mt-1">Registered in date range</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-neutral-950 p-5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400">Avg Orders / Buyer</p>
                <p className="text-2xl font-black mt-2">{data.customersData?.avgOrdersPerCustomer || 1}</p>
                <p className="text-[10px] text-neutral-500 mt-1">Order frequency</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-neutral-950 p-5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400">Avg Buyer Spend</p>
                <p className="text-2xl font-black mt-2">{formatMoney(data.customersData?.avgSpendPerCustomer)}</p>
                <p className="text-[10px] text-neutral-500 mt-1">Customer lifetime value in range</p>
              </div>
            </div>

            {/* MAIN VISUAL 1: AREA TREND CHART FOR NEW SIGNUPS */}
            <AreaTrendChart
              dailyData={dailyData.map((d) => ({ ...d, revenue: d.newSignups }))}
              title="New Customer Acquisition Trend Chart"
              subtitle="Line / area chart showing new registered user signups over time"
            />

            {/* MAIN VISUAL 2 & 3: NEW VS RETURNING COLUMN & DONUT SHARE CHARTS */}
            <div className="grid lg:grid-cols-2 gap-6">
              <VerticalColumnChart
                data={purchasingComparisonColumns}
                title="Buyer Type Column Comparison Chart"
                subtitle="First-time buyers vs returning repeat buyers count"
                isCurrency={false}
                valueKey="val"
              />

              <DonutChart
                items={customerCompositionSlices}
                title="Customer Composition Share Chart"
                subtitle="Proportion of first-time vs returning customers"
                isCurrency={false}
              />
            </div>

            {/* CUSTOMER PERFORMANCE TABLE */}
            <div className="rounded-2xl border border-white/10 bg-neutral-950 p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold text-white">Purchasing Customer Directory</h2>
                  <p className="text-[11px] text-neutral-400">Individual buyer order count, unit total, and lifetime brand spend</p>
                </div>

                <input
                  type="text"
                  placeholder="Filter by customer name or email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="rounded-xl border border-white/10 bg-neutral-900 px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none w-full sm:w-72"
                />
              </div>

              {filteredCustomers.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/10 text-[10px] uppercase tracking-wider text-neutral-500">
                        <th className="pb-3 font-semibold">Customer</th>
                        <th className="pb-3 font-semibold">Orders</th>
                        <th className="pb-3 font-semibold">Units</th>
                        <th className="pb-3 font-semibold">First Order</th>
                        <th className="pb-3 font-semibold">Last Order</th>
                        <th className="pb-3 font-semibold text-right">Total Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredCustomers.map((c) => (
                        <tr key={c.id} className="hover:bg-white/[0.02]">
                          <td className="py-3 font-bold text-white">
                            {c.name}
                            <span className="block text-[10px] text-neutral-500 font-normal">{c.email}</span>
                          </td>
                          <td className="py-3 font-semibold text-neutral-300">
                            {c.orders} {c.orders > 1 ? "(Repeat Buyer)" : ""}
                          </td>
                          <td className="py-3 text-neutral-300">{c.units}</td>
                          <td className="py-3 text-neutral-400">{formatDateStr(c.firstOrderDate)}</td>
                          <td className="py-3 text-neutral-400">{formatDateStr(c.lastOrderDate)}</td>
                          <td className="py-3 font-black text-amber-400 text-right">{formatMoney(c.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-neutral-500 py-8 text-center">
                  No purchasing customers match the selected date range or search filter.
                </p>
              )}
            </div>

          </>
        ) : null}
      </div>
    </main>
  );
}
