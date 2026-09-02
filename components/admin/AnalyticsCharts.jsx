"use client";

import { useState } from "react";

function formatMoney(amount) {
  return "₦" + Number(amount || 0).toLocaleString("en-NG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function formatNumber(num) {
  return Number(num || 0).toLocaleString("en-NG");
}

/* ============================================================
   REVENUE & AOV TREND CHART (Dual Line SVG with Tooltips)
============================================================ */

export function RevenueTrendChart({ data = [] }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-xs text-neutral-500">
        No daily revenue data available for this period.
      </div>
    );
  }

  const width = 800;
  const height = 260;
  const padding = { top: 20, right: 30, bottom: 40, left: 60 };

  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const maxRevenue = Math.max(...data.map((d) => d.revenue || 0), 1000);
  const maxAOV = Math.max(...data.map((d) => (d.orders > 0 ? d.revenue / d.orders : 0)), 100);

  const points = data.map((d, i) => {
    const x = padding.left + (i / Math.max(data.length - 1, 1)) * chartW;
    const yRev = padding.top + chartH - ((d.revenue || 0) / maxRevenue) * chartH;
    const aovVal = d.orders > 0 ? d.revenue / d.orders : 0;
    const yAov = padding.top + chartH - (aovVal / (maxAOV * 1.2 || 1)) * chartH;

    return { x, yRev, yAov, date: d.label || d.date, revenue: d.revenue || 0, orders: d.orders || 0, units: d.unitsSold || 0, aov: aovVal };
  });

  const pathRev = points.length > 0
    ? points.reduce((acc, p, i) => (i === 0 ? `M ${p.x},${p.yRev}` : `${acc} L ${p.x},${p.yRev}`), "")
    : "";

  const areaRev = points.length > 0
    ? `${pathRev} L ${points[points.length - 1].x},${padding.top + chartH} L ${points[0].x},${padding.top + chartH} Z`
    : "";

  const pathAov = points.length > 0
    ? points.reduce((acc, p, i) => (i === 0 ? `M ${p.x},${p.yAov}` : `${acc} L ${p.x},${p.yAov}`), "")
    : "";

  const activePoint = hoveredIdx !== null ? points[hoveredIdx] : points[points.length - 1];

  // Grid ticks
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => ({
    val: maxRevenue * ratio,
    y: padding.top + chartH - ratio * chartH,
  }));

  // X label indices (show ~5 to 7 labels max)
  const xStep = Math.max(1, Math.floor(data.length / 6));

  return (
    <div className="relative w-full">
      {/* HEADER / TOOLTIP SUMMARY */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4 pb-3 border-b border-white/5">
        <div className="flex items-center gap-6 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-3 h-1 rounded-full bg-amber-400" />
            <span className="text-neutral-400">Revenue:</span>
            <span className="font-bold text-white">{formatMoney(activePoint?.revenue)}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-3 h-1 rounded-full bg-amber-200/60" />
            <span className="text-neutral-400">Avg Order Value:</span>
            <span className="font-bold text-amber-200">{formatMoney(activePoint?.aov)}</span>
          </div>

          <div className="hidden sm:flex items-center gap-2">
            <span className="text-neutral-500">Orders:</span>
            <span className="font-semibold text-neutral-300">{activePoint?.orders}</span>
          </div>
        </div>

        <span className="text-[10px] uppercase tracking-wider text-amber-400/80 bg-amber-400/10 px-2.5 py-1 rounded-full">
          {activePoint?.date}
        </span>
      </div>

      {/* SVG CHART */}
      <div className="w-full overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto min-w-[500px]">
          <defs>
            <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* GRID LINES & Y LABELS */}
          {yTicks.map((tick, i) => (
            <g key={i}>
              <line
                x1={padding.left}
                y1={tick.y}
                x2={width - padding.right}
                y2={tick.y}
                stroke="#ffffff"
                strokeOpacity="0.06"
                strokeDasharray="4 4"
              />
              <text
                x={padding.left - 8}
                y={tick.y + 3}
                fill="#888888"
                fontSize="10"
                textAnchor="end"
              >
                {tick.val >= 1000000 ? `${(tick.val / 1000000).toFixed(1)}M` : tick.val >= 1000 ? `${(tick.val / 1000).toFixed(0)}k` : tick.val.toFixed(0)}
              </text>
            </g>
          ))}

          {/* REVENUE AREA */}
          <path d={areaRev} fill="url(#revGrad)" />

          {/* AOV LINE */}
          <path d={pathAov} fill="none" stroke="#fef08a" strokeWidth="1.5" strokeOpacity="0.6" strokeDasharray="3 3" />

          {/* REVENUE LINE */}
          <path d={pathRev} fill="none" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

          {/* X LABELS */}
          {points.map((p, i) => {
            if (i % xStep === 0 || i === points.length - 1) {
              return (
                <text
                  key={i}
                  x={p.x}
                  y={height - 10}
                  fill="#888888"
                  fontSize="10"
                  textAnchor="middle"
                >
                  {p.date}
                </text>
              );
            }
            return null;
          })}

          {/* INTERACTIVE HOVER OVERLAY */}
          {points.map((p, i) => (
            <g key={i} className="cursor-pointer" onMouseEnter={() => setHoveredIdx(i)}>
              <rect
                x={p.x - (chartW / points.length) / 2}
                y={padding.top}
                width={chartW / points.length}
                height={chartH}
                fill="transparent"
              />

              {hoveredIdx === i && (
                <>
                  <line
                    x1={p.x}
                    y1={padding.top}
                    x2={p.x}
                    y2={padding.top + chartH}
                    stroke="#fbbf24"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                  />
                  <circle cx={p.x} cy={p.yRev} r="5" fill="#fbbf24" stroke="#000000" strokeWidth="2" />
                  <circle cx={p.x} cy={p.yAov} r="4" fill="#fef08a" stroke="#000000" strokeWidth="1.5" />
                </>
              )}
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

/* ============================================================
   ORDERS & UNITS BAR CHART
============================================================ */

export function OrdersBarChart({ data = [] }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-xs text-neutral-500">
        No daily order data available.
      </div>
    );
  }

  const width = 800;
  const height = 220;
  const padding = { top: 20, right: 20, bottom: 40, left: 40 };

  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const maxOrders = Math.max(...data.map((d) => d.orders || 0), 5);

  const barWidth = Math.max(4, Math.min(24, (chartW / data.length) * 0.6));
  const activeItem = hoveredIdx !== null ? data[hoveredIdx] : data[data.length - 1];

  const xStep = Math.max(1, Math.floor(data.length / 6));

  return (
    <div className="relative w-full">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/5 text-xs">
        <div className="flex items-center gap-4">
          <div>
            <span className="text-neutral-400">Orders: </span>
            <span className="font-bold text-amber-400">{activeItem?.orders || 0}</span>
          </div>
          <div>
            <span className="text-neutral-400">Units Sold: </span>
            <span className="font-bold text-white">{activeItem?.unitsSold || 0}</span>
          </div>
        </div>

        <span className="text-[10px] text-neutral-400 uppercase tracking-wider">
          {activeItem?.label || activeItem?.date}
        </span>
      </div>

      <div className="w-full overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto min-w-[500px]">
          {/* HORIZONTAL GRID LINES */}
          {[0, 0.5, 1].map((ratio, i) => {
            const y = padding.top + chartH - ratio * chartH;
            return (
              <g key={i}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="#ffffff"
                  strokeOpacity="0.06"
                />
                <text x={padding.left - 6} y={y + 3} fill="#888888" fontSize="10" textAnchor="end">
                  {Math.round(maxOrders * ratio)}
                </text>
              </g>
            );
          })}

          {/* BARS */}
          {data.map((d, i) => {
            const x = padding.left + (i / Math.max(data.length - 1, 1)) * (chartW - barWidth);
            const barH = ((d.orders || 0) / maxOrders) * chartH;
            const y = padding.top + chartH - barH;
            const isHovered = hoveredIdx === i;

            return (
              <g key={i} className="cursor-pointer" onMouseEnter={() => setHoveredIdx(i)}>
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={Math.max(barH, 2)}
                  rx="3"
                  fill={isHovered ? "#fbbf24" : "rgba(251, 191, 36, 0.4)"}
                  className="transition-all duration-150"
                />

                {i % xStep === 0 && (
                  <text
                    x={x + barWidth / 2}
                    y={height - 10}
                    fill="#888888"
                    fontSize="10"
                    textAnchor="middle"
                  >
                    {d.label || d.date}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

/* ============================================================
   BEST SELLERS (Ranked Horizontal Bar Chart)
============================================================ */

export function BestSellersChart({ items = [] }) {
  if (!items || items.length === 0) {
    return (
      <p className="text-xs text-neutral-500 py-6 text-center">
        No best sellers recorded for this period.
      </p>
    );
  }

  const maxRevenue = Math.max(...items.map((i) => i.revenue || 0), 1);

  return (
    <div className="space-y-4">
      {items.map((item, idx) => {
        const pct = Math.min(100, Math.max(5, ((item.revenue || 0) / maxRevenue) * 100));

        return (
          <div key={item.id || idx} className="group">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                <span className="font-bold text-[10px] text-amber-400 w-4 shrink-0">
                  {idx + 1}.
                </span>
                <span className="font-medium text-neutral-200 truncate group-hover:text-amber-300 transition">
                  {item.name}
                </span>
              </div>

              <div className="text-right shrink-0">
                <span className="font-bold text-white">{formatMoney(item.revenue)}</span>
                <span className="text-[10px] text-neutral-500 ml-2">
                  ({formatNumber(item.unitsSold)} units)
                </span>
              </div>
            </div>

            {/* PROGRESS BAR */}
            <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ============================================================
   CATEGORY DONUT CHART
============================================================ */

export function CategoryDonutChart({ categories = [] }) {
  if (!categories || categories.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-xs text-neutral-500">
        No category revenue data available.
      </div>
    );
  }

  const totalRevenue = categories.reduce((sum, c) => sum + (c.revenue || 0), 0);

  if (totalRevenue === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-xs text-neutral-500">
        Zero category revenue recorded.
      </div>
    );
  }

  const colors = [
    "#fbbf24", // Amber 400
    "#f59e0b", // Amber 500
    "#d97706", // Amber 600
    "#a855f7", // Purple 500
    "#3b82f6", // Blue 500
    "#10b981", // Emerald 500
    "#ef4444", // Red 500
    "#6b7280", // Gray 500
  ];

  let cumulativeAngle = 0;

  const slices = categories.map((cat, idx) => {
    const value = cat.revenue || 0;
    const pct = value / totalRevenue;
    const startAngle = cumulativeAngle;
    const angle = pct * 360;
    cumulativeAngle += angle;

    return {
      name: cat.name || "Uncategorized",
      value,
      unitsSold: cat.unitsSold || 0,
      pct: (pct * 100).toFixed(1),
      color: colors[idx % colors.length],
      startAngle,
      angle,
    };
  });

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
      {/* SVG DONUT */}
      <div className="relative w-44 h-44 shrink-0">
        <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
          {slices.map((slice, i) => {
            const r = 38;
            const cx = 50;
            const cy = 50;

            const startRad = (slice.startAngle * Math.PI) / 180;
            const endRad = ((slice.startAngle + slice.angle) * Math.PI) / 180;

            const x1 = cx + r * Math.cos(startRad);
            const y1 = cy + r * Math.sin(startRad);
            const x2 = cx + r * Math.cos(endRad);
            const y2 = cy + r * Math.sin(endRad);

            const largeArc = slice.angle > 180 ? 1 : 0;

            const d = slice.angle >= 359.9
              ? `M ${cx + r},${cy} A ${r},${r} 0 1,0 ${cx - r},${cy} A ${r},${r} 0 1,0 ${cx + r},${cy}`
              : `M ${x1},${y1} A ${r},${r} 0 ${largeArc},1 ${x2},${y2}`;

            return (
              <path
                key={i}
                d={d}
                fill="none"
                stroke={slice.color}
                strokeWidth="16"
                className="transition-all duration-300 hover:opacity-80"
              />
            );
          })}
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2">
          <span className="text-[9px] uppercase tracking-wider text-neutral-400">Total</span>
          <span className="text-xs font-black text-amber-400">{formatMoney(totalRevenue)}</span>
        </div>
      </div>

      {/* LEGEND */}
      <div className="flex-1 w-full space-y-2 max-h-48 overflow-y-auto pr-1">
        {slices.map((slice, i) => (
          <div key={i} className="flex items-center justify-between text-xs pb-1.5 border-b border-white/5">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: slice.color }} />
              <span className="truncate text-neutral-300 font-medium">{slice.name}</span>
            </div>

            <div className="text-right shrink-0">
              <span className="font-bold text-white">{slice.pct}%</span>
              <span className="text-[10px] text-neutral-500 ml-1.5">({formatMoney(slice.value)})</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   ORDER STATUS BREAKDOWN CHART
============================================================ */

export function OrderStatusChart({ statuses = [] }) {
  if (!statuses || statuses.length === 0) {
    return (
      <p className="text-xs text-neutral-500 text-center py-6">
        No order status data available.
      </p>
    );
  }

  const totalOrders = statuses.reduce((sum, s) => sum + (s.count || 0), 0);

  const statusColors = {
    completed: "bg-emerald-400 text-emerald-400 border-emerald-400/30",
    delivered: "bg-emerald-400 text-emerald-400 border-emerald-400/30",
    processing: "bg-amber-400 text-amber-400 border-amber-400/30",
    pending: "bg-orange-400 text-orange-400 border-orange-400/30",
    shipped: "bg-blue-400 text-blue-400 border-blue-400/30",
    cancelled: "bg-red-400 text-red-400 border-red-400/30",
    canceled: "bg-red-400 text-red-400 border-red-400/30",
    failed: "bg-red-500 text-red-500 border-red-500/30",
  };

  return (
    <div className="space-y-4">
      {/* SEGMENTED BAR */}
      <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden flex">
        {statuses.map((s, idx) => {
          const pct = totalOrders > 0 ? (s.count / totalOrders) * 100 : 0;
          const colorClass = (statusColors[s.status.toLowerCase()] || "bg-neutral-500").split(" ")[0];

          return (
            <div
              key={idx}
              className={`h-full ${colorClass} border-r border-black/40 transition-all`}
              style={{ width: `${pct}%` }}
              title={`${s.status}: ${s.count} orders (${pct.toFixed(1)}%)`}
            />
          );
        })}
      </div>

      {/* GRID LEGEND */}
      <div className="grid grid-cols-2 gap-2 text-xs pt-1">
        {statuses.map((s, idx) => {
          const colorClass = statusColors[s.status.toLowerCase()] || "bg-neutral-500 text-neutral-400 border-neutral-500/30";
          const [bg, text] = colorClass.split(" ");
          const pct = totalOrders > 0 ? ((s.count / totalOrders) * 100).toFixed(0) : 0;

          return (
            <div key={idx} className="flex items-center justify-between p-2 rounded-xl border border-white/5 bg-neutral-900/60">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${bg}`} />
                <span className="capitalize text-neutral-300 font-medium">{s.status}</span>
              </div>

              <div className="text-right">
                <span className={`font-bold ${text}`}>{s.count}</span>
                <span className="text-[10px] text-neutral-500 ml-1">({pct}%)</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
