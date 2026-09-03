"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { HorizontalBarChart } from "@/components/admin/AnalyticsCharts";

export default function ProductAnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("30d");
  const [metric, setMetric] = useState("revenue"); // "revenue" | "unitsSold" | "orders" | "price"
  const [search, setSearch] = useState("");
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAnalytics(range);
  }, [range]);

  async function fetchAnalytics(selectedRange) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/analytics?range=${selectedRange}`);
      const json = await res.json();

      if (res.ok && json.success) {
        setData(json);
      } else {
        setError(json.error || "Failed to load product analytics");
      }
    } catch (err) {
      console.error("Product analytics fetch error:", err);
      setError("An error occurred while loading product analytics.");
    } finally {
      setLoading(false);
    }
  }

  function formatMoney(amount) {
    return "₦" + Number(amount || 0).toLocaleString("en-NG");
  }

  const rawProducts = data?.products || [];

  const sortedProducts = [...rawProducts].sort((a, b) => {
    if (metric === "revenue") return (b.revenue || 0) - (a.revenue || 0);
    if (metric === "unitsSold") return (b.unitsSold || 0) - (a.unitsSold || 0);
    if (metric === "orders") return (b.orders || 0) - (a.orders || 0);
    if (metric === "price") return (b.price || 0) - (a.price || 0);
    return 0;
  });

  const filteredProducts = sortedProducts.filter((p) =>
    (p.name || "").toLowerCase().includes(search.toLowerCase())
  );

  const top10 = sortedProducts.slice(0, 10);

  const brandTitle =
    data?.brand === "UTHY"
      ? "UTHY LUXURY"
      : data?.brand === "ALOMZIEE"
      ? "ALOMZIEE FOOTIES"
      : "Brand Products";

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
              {brandTitle} — Product Performance & Best Sellers
            </h1>
            <p className="text-xs text-neutral-400 mt-1 max-w-2xl">
              Visual rankings, revenue generation, unit sales, and stock metrics for individual catalog items.
            </p>
          </div>

          <div className="flex items-center gap-1.5 rounded-2xl border border-white/10 bg-neutral-950 p-1.5">
            {["today", "7d", "30d", "90d", "1y"].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase transition ${
                  range === r
                    ? "bg-amber-500 text-black shadow-md"
                    : "text-neutral-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* ERROR / LOADING DISPLAY */}
        {error ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-red-400 text-xs">
            {error}
          </div>
        ) : loading ? (
          <div className="py-20 text-center">
            <p className="text-[10px] uppercase tracking-[0.3em] text-amber-400 animate-pulse">
              VÉRANE PRODUCT ANALYTICS
            </p>
            <p className="text-xs text-neutral-500 mt-2">Loading product metrics...</p>
          </div>
        ) : data ? (
          <>
            {/* VISUAL HORIZONTAL BAR CHART - TOP RANKINGS */}
            <HorizontalBarChart
              items={top10}
              title="Best Seller Performance Ranking Chart"
              subtitle="Interactive bar visualization of top performing catalog items"
              isCurrency={true}
            />

            {/* PRODUCT PERFORMANCE TABLE */}
            <div className="rounded-2xl border border-white/10 bg-neutral-950 p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold text-white">Complete Product Performance Table</h2>
                  <p className="text-[11px] text-neutral-400">All brand products and stock status</p>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    placeholder="Filter products..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="rounded-xl border border-white/10 bg-neutral-900 px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none w-full sm:w-64"
                  />
                </div>
              </div>

              {filteredProducts.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/10 text-[10px] uppercase tracking-wider text-neutral-500">
                        <th className="pb-3 font-semibold">Product Name</th>
                        <th className="pb-3 font-semibold">Category</th>
                        <th className="pb-3 font-semibold">Price</th>
                        <th className="pb-3 font-semibold">Inventory</th>
                        <th className="pb-3 font-semibold">Units Sold</th>
                        <th className="pb-3 font-semibold text-right">Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredProducts.map((prod) => (
                        <tr key={prod.id} className="hover:bg-white/[0.02]">
                          <td className="py-3 font-bold text-white max-w-[220px] truncate">
                            {prod.name}
                          </td>
                          <td className="py-3 text-neutral-400">{prod.category}</td>
                          <td className="py-3 text-neutral-300">{formatMoney(prod.price)}</td>
                          <td className="py-3">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                prod.inventory <= 0
                                  ? "bg-red-500/10 text-red-400"
                                  : prod.inventory <= 5
                                  ? "bg-orange-500/10 text-orange-400"
                                  : "bg-emerald-500/10 text-emerald-400"
                              }`}
                            >
                              {prod.inventory <= 0
                                ? "Out of Stock"
                                : `${prod.inventory} in stock`}
                            </span>
                          </td>
                          <td className="py-3 font-semibold text-neutral-200">{prod.unitsSold}</td>
                          <td className="py-3 font-black text-amber-400 text-right">
                            {formatMoney(prod.revenue)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-neutral-500 py-6 text-center">
                  No matching products found.
                </p>
              )}
            </div>
          </>
        ) : null}
      </div>
    </main>
  );
}
