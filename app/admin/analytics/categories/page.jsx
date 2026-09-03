"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { VerticalColumnChart, DonutChart, HorizontalBarChart } from "@/components/admin/AnalyticsCharts";

export default function CategoryAnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("30d");
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
        setError(json.error || "Failed to load category analytics");
      }
    } catch (err) {
      console.error("Category analytics fetch error:", err);
      setError("An error occurred while loading category analytics.");
    } finally {
      setLoading(false);
    }
  }

  function formatMoney(amount) {
    return "₦" + Number(amount || 0).toLocaleString("en-NG");
  }

  const topCategories = data?.analytics?.topCategories || [];
  const topCollections = data?.analytics?.topCollections || [];

  const brandTitle =
    data?.brand === "UTHY"
      ? "UTHY LUXURY"
      : data?.brand === "ALOMZIEE"
      ? "ALOMZIEE FOOTIES"
      : "Brand Catalog";

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
              {brandTitle} — Category & Collection Analytics
            </h1>
            <p className="text-xs text-neutral-400 mt-1 max-w-2xl">
              Visual performance breakdowns across product categories and curated collections.
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
              VÉRANE CATEGORY ANALYTICS
            </p>
            <p className="text-xs text-neutral-500 mt-2">Loading category and collection metrics...</p>
          </div>
        ) : data ? (
          <>
            {/* VISUAL ROW 1: CATEGORY COLUMN CHART & CATEGORY DONUT CHART */}
            <div className="grid lg:grid-cols-2 gap-8">
              <VerticalColumnChart
                data={topCategories}
                title="Category Revenue Column Chart"
                subtitle="Visual category revenue comparison"
                isCurrency={true}
                valueKey="revenue"
              />

              <DonutChart
                items={topCategories}
                title="Category Revenue Share Donut Chart"
                subtitle="Proportional share of category sales"
                isCurrency={true}
              />
            </div>

            {/* VISUAL ROW 2: COLLECTION COLUMN CHART & RANKING CHART */}
            <div className="grid lg:grid-cols-2 gap-8">
              <VerticalColumnChart
                data={topCollections}
                title="Collection Revenue Column Chart"
                subtitle="Visual collection performance comparison"
                isCurrency={true}
                valueKey="revenue"
              />

              <HorizontalBarChart
                items={topCollections}
                title="Collection Ranking Chart"
                subtitle="Interactive collection ranking by key metrics"
                isCurrency={true}
              />
            </div>

            {/* SUPPORTING SUMMARY DATA TABLES */}
            <div className="grid lg:grid-cols-2 gap-8">

              {/* CATEGORY SUMMARY TABLE */}
              <div className="rounded-2xl border border-white/10 bg-neutral-950 p-6 space-y-4">
                <h2 className="text-base font-bold text-white">Category Performance Summary</h2>
                {topCategories.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-white/10 text-[10px] uppercase tracking-wider text-neutral-500">
                          <th className="pb-3 font-semibold">Category Name</th>
                          <th className="pb-3 font-semibold">Units Sold</th>
                          <th className="pb-3 font-semibold text-right">Revenue</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {topCategories.map((cat, i) => (
                          <tr key={cat.name || i} className="hover:bg-white/[0.02]">
                            <td className="py-3 font-bold text-white">{cat.name}</td>
                            <td className="py-3 text-neutral-300">{cat.unitsSold}</td>
                            <td className="py-3 font-black text-amber-400 text-right">{formatMoney(cat.revenue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-neutral-500 py-6">No category sales recorded for this period.</p>
                )}
              </div>

              {/* COLLECTION SUMMARY TABLE */}
              <div className="rounded-2xl border border-white/10 bg-neutral-950 p-6 space-y-4">
                <h2 className="text-base font-bold text-white">Collection Performance Summary</h2>
                {topCollections.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-white/10 text-[10px] uppercase tracking-wider text-neutral-500">
                          <th className="pb-3 font-semibold">Collection Name</th>
                          <th className="pb-3 font-semibold">Units Sold</th>
                          <th className="pb-3 font-semibold text-right">Revenue</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {topCollections.map((col, i) => (
                          <tr key={col.name || i} className="hover:bg-white/[0.02]">
                            <td className="py-3 font-bold text-white">{col.name}</td>
                            <td className="py-3 text-neutral-300">{col.unitsSold}</td>
                            <td className="py-3 font-black text-amber-400 text-right">{formatMoney(col.revenue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-neutral-500 py-6">No collection sales recorded for this period.</p>
                )}
              </div>

            </div>
          </>
        ) : null}
      </div>
    </main>
  );
}
