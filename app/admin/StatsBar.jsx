"use client";

import { useEffect, useState } from "react";

function formatCurrency(value) {
  return `₦${Number(value || 0).toLocaleString("en-NG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("en-NG");
}

function Growth({ value }) {
  if (!value) {
    return (
      <span className="text-[10px] uppercase tracking-wider text-neutral-500">
        No change
      </span>
    );
  }

  const positive = value > 0;

  return (
    <span
      className={`text-[10px] font-medium tracking-wide ${
        positive ? "text-emerald-400" : "text-red-400"
      }`}
    >
      {positive ? "↑" : "↓"} {Math.abs(value).toFixed(1)}% this month
    </span>
  );
}

export default function StatsBar() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadStats() {
      try {
        setLoading(true);

        const response = await fetch("/api/admin/analytics", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Failed to load analytics");
        }

        const data = await response.json();

        if (mounted) {
          setStats(data);
          setError(false);
        }
      } catch (err) {
        console.error("StatsBar:", err);

        if (mounted) {
          setError(true);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadStats();

    return () => {
      mounted = false;
    };
  }, []);

  const overview = stats?.overview || {};

  const items = [
    {
      label: "Total Revenue",
      value: formatCurrency(overview.totalRevenue),
      subtext: "All-time revenue",
      growth: overview.revenueGrowth,
    },
    {
      label: "Orders",
      value: formatNumber(overview.totalOrders),
      subtext: `${formatNumber(overview.monthOrders)} this month`,
      growth: overview.orderGrowth,
    },
    {
      label: "Products",
      value: formatNumber(overview.totalProducts),
      subtext: "Products in catalogue",
    },
    {
      label: "Customers",
      value: formatNumber(overview.totalCustomers),
      subtext: `${formatNumber(overview.totalSubscribers)} subscribers`,
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {items.map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-white/10 bg-neutral-950 p-5"
          >
            <div className="h-2.5 w-20 animate-pulse rounded bg-white/10" />

            <div className="mt-4 h-7 w-28 animate-pulse rounded bg-white/10" />

            <div className="mt-3 h-2.5 w-24 animate-pulse rounded bg-white/5" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="mb-8 rounded-2xl border border-red-500/20 bg-red-500/5 px-5 py-4">
        <p className="text-xs font-medium text-red-400">
          Unable to load dashboard statistics.
        </p>

        <p className="mt-1 text-[11px] text-neutral-500">
          Check your analytics API and database connection.
        </p>
      </div>
    );
  }

  return (
    <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="
            group
            relative
            overflow-hidden
            rounded-2xl
            border border-white/10
            bg-neutral-950
            p-5
            transition-all
            duration-300
            hover:border-white/20
            hover:bg-neutral-900
          "
        >
          {/* Subtle luxury glow */}
          <div
            className="
              pointer-events-none
              absolute
              -right-10
              -top-10
              h-24
              w-24
              rounded-full
              bg-white/[0.025]
              blur-2xl
              transition-all
              duration-500
              group-hover:bg-white/[0.05]
            "
          />

          <div className="relative">
            <div className="flex items-center justify-between">
              <p className="text-[9px] font-medium uppercase tracking-[0.24em] text-neutral-500">
                {item.label}
              </p>

              <span className="h-1.5 w-1.5 rounded-full bg-white/20 transition-colors group-hover:bg-white/60" />
            </div>

            <p className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              {item.value}
            </p>

            <div className="mt-2 flex min-h-[16px] items-center justify-between gap-2">
              <p className="truncate text-[10px] text-neutral-600">
                {item.subtext}
              </p>

              {item.growth !== undefined && (
                <Growth value={item.growth} />
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}