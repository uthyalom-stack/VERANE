"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function AdminAnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("30d");
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAnalytics();
  }, [range]);

  async function fetchAnalytics() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/analytics?range=${range}`);
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

  function formatMoney(amount) {
    return "₦" + Number(amount || 0).toLocaleString("en-NG");
  }

  return (
    <main className="min-h-screen bg-black text-white p-6 md:p-12">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-white/10 pb-6 gap-4">
          <div>
            <Link href="/admin" className="text-xs uppercase tracking-widest text-neutral-500 hover:text-white">
              ← Back to Admin
            </Link>
            <h1 className="text-3xl font-black mt-2">
              {data?.brand === "UTHY" ? "UTHY LUXURY Analytics" : data?.brand === "ALOMZIEE" ? "ALOMZIEE FOOTIES Analytics" : "Store Analytics"}
            </h1>
            <p className="text-xs text-neutral-400 mt-1">
              Brand-isolated revenue, order metrics, best sellers, and stock health.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {["7d", "30d", "90d", "1y"].map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-4 py-2 rounded-full text-xs font-bold uppercase transition ${
                  range === r ? "bg-amber-500 text-black" : "border border-white/10 text-neutral-400 hover:text-white"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {error ? (
          <div className="mt-8 rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-red-400 text-xs">
            {error}
          </div>
        ) : loading ? (
          <div className="mt-12 text-center text-xs text-neutral-500 uppercase tracking-widest animate-pulse">
            Loading analytics data...
          </div>
        ) : data?.overview ? (
          <>
            {/* OVERVIEW STATS */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
              <div className="rounded-2xl border border-white/10 bg-neutral-950 p-5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400">Total Revenue</p>
                <p className="text-2xl font-black mt-2">{formatMoney(data.overview.revenue)}</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-neutral-950 p-5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400">Orders Placed</p>
                <p className="text-2xl font-black mt-2">{data.overview.orders}</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-neutral-950 p-5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400">Units Sold</p>
                <p className="text-2xl font-black mt-2">{data.overview.unitsSold}</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-neutral-950 p-5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400">Avg Order Value</p>
                <p className="text-2xl font-black mt-2">{formatMoney(data.overview.averageOrderValue)}</p>
              </div>
            </div>

            {/* SECONDARY STATS */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <div className="rounded-2xl border border-white/10 bg-neutral-950 p-5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Active Products</p>
                <p className="text-xl font-bold mt-1">{data.overview.products}</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-neutral-950 p-5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Inventory Valuation</p>
                <p className="text-xl font-bold mt-1">{formatMoney(data.overview.inventoryValue)}</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-neutral-950 p-5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Low Stock Items</p>
                <p className="text-xl font-bold mt-1 text-orange-400">{data.overview.lowStock}</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-neutral-950 p-5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Out of Stock</p>
                <p className="text-xl font-bold mt-1 text-red-400">{data.overview.outOfStock}</p>
              </div>
            </div>

            {/* TABLES GRID */}
            <div className="grid lg:grid-cols-2 gap-8 mt-8">

              {/* BEST SELLERS */}
              <div className="rounded-2xl border border-white/10 bg-neutral-950 p-6">
                <h2 className="text-lg font-bold mb-4">Top Performing Products</h2>
                {data.analytics?.bestSellers?.length ? (
                  <div className="space-y-4">
                    {data.analytics.bestSellers.map((item, i) => (
                      <div key={item.id} className="flex items-center justify-between border-b border-white/5 pb-3">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-bold text-amber-400 w-5">{i + 1}.</span>
                          <div>
                            <p className="text-xs font-bold truncate max-w-[200px]">{item.name}</p>
                            <p className="text-[10px] text-neutral-500">{item.unitsSold} units sold</p>
                          </div>
                        </div>
                        <p className="text-xs font-black text-amber-400">{formatMoney(item.revenue)}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-neutral-500">No sales recorded for this period.</p>
                )}
              </div>

              {/* LOW STOCK ALERTS */}
              <div className="rounded-2xl border border-white/10 bg-neutral-950 p-6">
                <h2 className="text-lg font-bold mb-4">Inventory & Low Stock Alerts</h2>
                {data.inventory?.lowStock?.length ? (
                  <div className="space-y-4">
                    {data.inventory.lowStock.map((item) => (
                      <div key={item.id} className="flex items-center justify-between border-b border-white/5 pb-3">
                        <div>
                          <p className="text-xs font-bold truncate max-w-[220px]">{item.name}</p>
                          <p className="text-[10px] text-neutral-500">{formatMoney(item.price)}</p>
                        </div>
                        <span className="px-3 py-1 rounded-full bg-orange-500/10 text-orange-400 text-[10px] font-bold">
                          {item.inventory} left
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-neutral-500">All products have sufficient stock.</p>
                )}
              </div>

            </div>
          </>
        ) : null}
      </div>
    </main>
  );
}
