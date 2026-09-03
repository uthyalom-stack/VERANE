"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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

  const maxCatRevenue = Math.max(...topCategories.map((c) => Number(c.revenue || 0)), 1);
  const maxColRevenue = Math.max(...topCollections.map((c) => Number(c.revenue || 0)), 1);

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
              Brand-isolated performance breakdowns across product categories and curated collections.
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
            <p className="text-xs text-neutral-500 mt-2">Loading category and collection data...</p>
          </div>
        ) : data ? (
          <div className="grid lg:grid-cols-2 gap-8">

            {/* CATEGORY PERFORMANCE */}
            <div className="rounded-2xl border border-white/10 bg-neutral-950 p-6 space-y-6">
              <div>
                <h2 className="text-base font-bold text-white">Category Performance</h2>
                <p className="text-[11px] text-neutral-400">Revenue and unit sales grouped by category</p>
              </div>

              {topCategories.length > 0 ? (
                <div className="space-y-4">
                  {topCategories.map((cat, i) => {
                    const rev = Number(cat.revenue || 0);
                    const pct = Math.max((rev / maxCatRevenue) * 100, 3);

                    return (
                      <div key={cat.name || i} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <div>
                            <span className="font-bold text-white">{cat.name}</span>
                            <span className="text-[10px] text-neutral-500 ml-2">
                              ({cat.unitsSold} units)
                            </span>
                          </div>
                          <span className="font-black text-amber-400">{formatMoney(rev)}</span>
                        </div>
                        <div className="w-full h-2.5 rounded-full bg-neutral-900 overflow-hidden border border-white/5">
                          <div
                            className="h-full bg-amber-500 rounded-full transition-all duration-300"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-neutral-500 py-8 text-center">
                  No category sales recorded for this period.
                </p>
              )}
            </div>

            {/* COLLECTION PERFORMANCE */}
            <div className="rounded-2xl border border-white/10 bg-neutral-950 p-6 space-y-6">
              <div>
                <h2 className="text-base font-bold text-white">Collection Performance</h2>
                <p className="text-[11px] text-neutral-400">Revenue and unit sales grouped by collection</p>
              </div>

              {topCollections.length > 0 ? (
                <div className="space-y-4">
                  {topCollections.map((col, i) => {
                    const rev = Number(col.revenue || 0);
                    const pct = Math.max((rev / maxColRevenue) * 100, 3);

                    return (
                      <div key={col.name || i} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <div>
                            <span className="font-bold text-white">{col.name}</span>
                            <span className="text-[10px] text-neutral-500 ml-2">
                              ({col.unitsSold} units)
                            </span>
                          </div>
                          <span className="font-black text-amber-400">{formatMoney(rev)}</span>
                        </div>
                        <div className="w-full h-2.5 rounded-full bg-neutral-900 overflow-hidden border border-white/5">
                          <div
                            className="h-full bg-amber-500 rounded-full transition-all duration-300"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-neutral-500 py-8 text-center">
                  No collection sales recorded for this period.
                </p>
              )}
            </div>

          </div>
        ) : null}
      </div>
    </main>
  );
}
