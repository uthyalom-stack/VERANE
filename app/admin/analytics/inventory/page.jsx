"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DonutChart, VerticalColumnChart, HorizontalBarChart, AreaTrendChart } from "@/components/admin/AnalyticsCharts";

export default function InventoryAnalyticsPage() {
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
        setError(json.error || "Failed to load inventory analytics");
      }
    } catch (err) {
      console.error("Inventory analytics fetch error:", err);
      setError("An error occurred while loading inventory analytics.");
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

  const brandTitle =
    data?.brand === "UTHY"
      ? "UTHY LUXURY"
      : data?.brand === "ALOMZIEE"
      ? "ALOMZIEE FOOTIES"
      : "Brand Inventory";

  const dailyData = data?.analytics?.daily || [];
  const rawProducts = data?.products || [];
  const inventoryData = data?.inventoryData || {};

  const filteredProducts = rawProducts.filter(
    (p) =>
      (p.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (p.category || "").toLowerCase().includes(search.toLowerCase())
  );

  const statusSlices = (inventoryData.statusBreakdown || []).map((sb) => ({
    name: sb.name,
    revenue: sb.value, // maps value to slice size
  }));

  const categoryStockColumns = (data?.analytics?.topCategories || []).map((cat) => ({
    name: cat.name,
    unitsSold: cat.unitsSold,
  }));

  const topHoldingsMapped = (inventoryData.topHoldings || []).map((h) => ({
    id: h.id,
    name: h.name,
    inventory: h.inventory,
    valuation: h.valuation,
  }));

  const velocityItems = (inventoryData.velocityComparison || []).map((v) => ({
    id: v.id,
    name: v.name,
    unitsSold: v.unitsSold,
    currentStock: v.currentStock,
  }));

  const demandProductItems = (inventoryData.demandByProduct || []).map((d) => ({
    id: d.id,
    name: d.name,
    demand: d.count,
  }));

  const demandCategoryItems = (inventoryData.demandByCategory || []).map((c) => ({
    name: c.name,
    demand: c.count,
  }));

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
              {brandTitle} — Inventory & Restock Demand Analytics
            </h1>
            <p className="text-xs text-neutral-400 mt-1 max-w-2xl">
              Real-time stock health, velocity comparisons, restock priority rankings, and customer waitlist demand.
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
              VÉRANE INVENTORY ANALYTICS
            </p>
            <p className="text-xs text-neutral-500 mt-2">Loading stock and restock metrics...</p>
          </div>
        ) : data?.overview ? (
          <>
            {/* CURRENT STOCK KPIS */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-white/10 bg-neutral-950 p-5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400">Total Stock Units</p>
                <p className="text-2xl font-black mt-2">{data.overview.totalInventoryUnits}</p>
                <p className="text-[10px] text-neutral-500 mt-1">Across {data.overview.products} catalog items</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-neutral-950 p-5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400">Inventory Valuation</p>
                <p className="text-2xl font-black mt-2">{formatMoney(data.overview.inventoryValue)}</p>
                <p className="text-[10px] text-neutral-500 mt-1">Total current retail value</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-neutral-950 p-5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400">Sold Out Items</p>
                <p className="text-2xl font-black mt-2 text-red-400">{data.overview.outOfStock}</p>
                <p className="text-[10px] text-neutral-500 mt-1">Requires urgent restock</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-neutral-950 p-5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400">Waitlist Restock Demand</p>
                <p className="text-2xl font-black mt-2 text-amber-400">{data.overview.waitingListCount || 0}</p>
                <p className="text-[10px] text-neutral-500 mt-1">Waiting customer requests</p>
              </div>
            </div>

            {/* VISUAL CHARTS ROW 1: HEALTH DONUT & CATEGORY STOCK COLUMNS */}
            <div className="grid lg:grid-cols-2 gap-6">
              <DonutChart
                items={statusSlices}
                title="Stock Status Health Chart"
                subtitle="Distribution across Sold Out, Few Left, Almost Sold Out, Available"
                isCurrency={false}
              />

              <VerticalColumnChart
                data={categoryStockColumns}
                title="Category Sales Volume Column Chart"
                subtitle="Units sold per category in selected period"
                isCurrency={false}
                valueKey="unitsSold"
              />
            </div>

            {/* VISUAL CHARTS ROW 2: TOP HOLDINGS & SALES VS INVENTORY VELOCITY */}
            <div className="grid lg:grid-cols-2 gap-6">
              <HorizontalBarChart
                items={topHoldingsMapped}
                title="Top Inventory Holdings Chart"
                subtitle="Products with highest current stock quantities"
                isCurrency={false}
                valueKey="inventory"
                hideMetricSelector={true}
              />

              <HorizontalBarChart
                items={velocityItems}
                title="Units Sold vs Stock Velocity Chart"
                subtitle="Sales velocity per catalog item vs remaining stock"
                isCurrency={false}
                valueKey="unitsSold"
                hideMetricSelector={true}
              />
            </div>

            {/* VISUAL CHARTS ROW 3: DEMAND BY PRODUCT & DEMAND BY CATEGORY */}
            <div className="grid lg:grid-cols-2 gap-6">
              <HorizontalBarChart
                items={demandProductItems}
                title="Waitlist Demand by Product Chart"
                subtitle="Products with highest customer restock notifications"
                isCurrency={false}
                valueKey="demand"
                hideMetricSelector={true}
              />

              <VerticalColumnChart
                data={demandCategoryItems}
                title="Waitlist Demand by Category Column Chart"
                subtitle="Restock notification counts grouped by category"
                isCurrency={false}
                valueKey="demand"
              />
            </div>

            {/* HISTORICAL SALES DISPATCH TREND */}
            <AreaTrendChart
              dailyData={dailyData}
              title="Stock Outflow & Units Dispatched Trend"
              subtitle="Daily unit sales over selected period"
            />

            {/* RESTOCK PRIORITY RECOMMENDATIONS */}
            <div className="rounded-2xl border border-white/10 bg-neutral-950 p-6 space-y-4">
              <div>
                <h2 className="text-base font-bold text-white">Restock Priority Action Center</h2>
                <p className="text-[11px] text-neutral-400">
                  Calculated based on customer waitlist demand, recent sales velocity, and current stock levels
                </p>
              </div>

              {inventoryData.restockPriority?.length ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {inventoryData.restockPriority.slice(0, 6).map((item) => (
                    <div key={item.id} className="rounded-xl border border-white/10 bg-neutral-900/60 p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">{item.category}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            item.urgencyBadge === "Critical Restock"
                              ? "bg-red-500/20 text-red-400"
                              : item.urgencyBadge === "Low Stock Risk"
                              ? "bg-orange-500/20 text-orange-400"
                              : "bg-neutral-800 text-neutral-400"
                          }`}
                        >
                          {item.urgencyBadge}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-white truncate">{item.name}</p>
                      <div className="flex items-center justify-between text-[11px] text-neutral-400 pt-1 border-t border-white/5">
                        <span>Current Stock: <strong className="text-white">{item.inventory}</strong></span>
                        <span>Waitlist: <strong className="text-amber-400">{item.waitingListDemand}</strong></span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-neutral-500 py-6">No restock alerts at this time.</p>
              )}
            </div>

            {/* PRODUCT INVENTORY & SALES DIRECTORY */}
            <div className="rounded-2xl border border-white/10 bg-neutral-950 p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold text-white">Inventory & Demand Directory</h2>
                  <p className="text-[11px] text-neutral-400">Current stock, sales velocity, and customer restock requests</p>
                </div>

                <input
                  type="text"
                  placeholder="Filter inventory products..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="rounded-xl border border-white/10 bg-neutral-900 px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none w-full sm:w-64"
                />
              </div>

              {filteredProducts.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/10 text-[10px] uppercase tracking-wider text-neutral-500">
                        <th className="pb-3 font-semibold">Product</th>
                        <th className="pb-3 font-semibold">Category</th>
                        <th className="pb-3 font-semibold">Price</th>
                        <th className="pb-3 font-semibold">Current Stock</th>
                        <th className="pb-3 font-semibold">Units Sold</th>
                        <th className="pb-3 font-semibold">Waitlist Demand</th>
                        <th className="pb-3 font-semibold text-right">Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredProducts.map((prod) => (
                        <tr key={prod.id} className="hover:bg-white/[0.02]">
                          <td className="py-3 font-bold text-white max-w-[200px] truncate">{prod.name}</td>
                          <td className="py-3 text-neutral-400">{prod.category}</td>
                          <td className="py-3 text-neutral-300">{formatMoney(prod.price)}</td>
                          <td className="py-3">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                prod.inventory <= 0
                                  ? "bg-red-500/10 text-red-400"
                                  : prod.inventory <= 10
                                  ? "bg-orange-500/10 text-orange-400"
                                  : "bg-emerald-500/10 text-emerald-400"
                              }`}
                            >
                              {prod.inventory <= 0 ? "Sold Out" : `${prod.inventory} in stock`}
                            </span>
                          </td>
                          <td className="py-3 font-semibold text-neutral-200">{prod.unitsSold}</td>
                          <td className="py-3 font-bold text-amber-400">
                            {inventoryData.demandByProduct?.find((d) => d.id === prod.id)?.count || 0}
                          </td>
                          <td className="py-3 font-black text-amber-400 text-right">{formatMoney(prod.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-neutral-500 py-6 text-center">No inventory records found.</p>
              )}
            </div>

          </>
        ) : null}
      </div>
    </main>
  );
}
