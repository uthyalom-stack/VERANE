"use client";

import { useState } from "react";

/* ====================================================================
   1. AREA TREND CHART (Line / Smooth Area Trend over Time)
==================================================================== */
export function AreaTrendChart({ dailyData = [], title = "Sales Trend", subtitle = "Revenue over time" }) {
  const [metric, setMetric] = useState("revenue"); // "revenue" | "orders" | "unitsSold"
  const [hoveredPoint, setHoveredPoint] = useState(null);

  if (!dailyData || dailyData.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-white/10 bg-neutral-950 p-6 text-center text-xs text-neutral-500">
        No trend data available for the selected range.
      </div>
    );
  }

  function formatValue(val) {
    if (metric === "revenue") {
      return "₦" + Number(val || 0).toLocaleString("en-NG");
    }
    return Number(val || 0).toLocaleString("en-NG");
  }

  const values = dailyData.map((d) => Number(d[metric] || 0));
  const maxVal = Math.max(...values, 1);

  const width = 800;
  const height = 240;
  const paddingX = 45;
  const paddingY = 30;

  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingY * 2;

  const points = dailyData.map((d, index) => {
    const x = paddingX + (dailyData.length > 1 ? (index / (dailyData.length - 1)) * chartWidth : chartWidth / 2);
    const val = Number(d[metric] || 0);
    const y = height - paddingY - (val / maxVal) * chartHeight;
    return { x, y, val, label: d.label, date: d.date, rawData: d };
  });

  const pathD = points.reduce((acc, point, idx) => {
    return idx === 0 ? `M ${point.x} ${point.y}` : `${acc} L ${point.x} ${point.y}`;
  }, "");

  const areaD = `${pathD} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`;

  return (
    <div className="rounded-2xl border border-white/10 bg-neutral-950 p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-white">{title}</h3>
          <p className="text-[11px] text-neutral-400 mt-0.5">{subtitle}</p>
        </div>

        <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-neutral-900/80 p-1">
          {[
            { key: "revenue", label: "Revenue" },
            { key: "orders", label: "Orders" },
            { key: "unitsSold", label: "Units Sold" },
          ].map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => {
                setMetric(m.key);
                setHoveredPoint(null);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                metric === m.key
                  ? "bg-amber-500 text-black shadow"
                  : "text-neutral-400 hover:text-white hover:bg-white/5"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative w-full overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto min-w-[500px] overflow-visible">
          <defs>
            <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = height - paddingY - ratio * chartHeight;
            const gridVal = ratio * maxVal;
            return (
              <g key={ratio}>
                <line x1={paddingX} y1={y} x2={width - paddingX} y2={y} stroke="#262626" strokeDasharray="4 4" strokeWidth="1" />
                <text x={paddingX - 8} y={y + 3} fill="#737373" fontSize="9" textAnchor="end">
                  {metric === "revenue"
                    ? gridVal >= 1000000
                      ? `₦${(gridVal / 1000000).toFixed(1)}M`
                      : gridVal >= 1000
                      ? `₦${(gridVal / 1000).toFixed(0)}k`
                      : `₦${Math.round(gridVal)}`
                    : Math.round(gridVal)}
                </text>
              </g>
            );
          })}

          <path d={areaD} fill="url(#trendGradient)" />
          <path d={pathD} fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

          {points.map((p, i) => (
            <g key={i}>
              <circle
                cx={p.x}
                cy={p.y}
                r={hoveredPoint?.index === i ? "6" : "3.5"}
                className="transition-all duration-150 cursor-pointer"
                fill={hoveredPoint?.index === i ? "#ffffff" : "#f59e0b"}
                stroke="#000000"
                strokeWidth="2"
                onMouseEnter={() => setHoveredPoint({ ...p, index: i })}
                onMouseLeave={() => setHoveredPoint(null)}
              />
            </g>
          ))}
        </svg>

        {hoveredPoint && (
          <div
            className="absolute pointer-events-none z-10 -translate-x-1/2 -translate-y-full rounded-xl border border-white/20 bg-neutral-900/95 px-3 py-2 shadow-2xl backdrop-blur-md"
            style={{
              left: `${(hoveredPoint.x / width) * 100}%`,
              top: `${(hoveredPoint.y / height) * 100 - 8}%`,
            }}
          >
            <p className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold">{hoveredPoint.label}</p>
            <p className="text-xs font-black text-amber-400 mt-0.5">{formatValue(hoveredPoint.val)}</p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-[10px] text-neutral-500 px-2">
        <span>{dailyData[0]?.label || ""}</span>
        <span>{dailyData[dailyData.length - 1]?.label || ""}</span>
      </div>
    </div>
  );
}

/* Default export compatibility for imports expecting AnalyticsCharts */
export default AreaTrendChart;


/* ====================================================================
   2. VERTICAL COLUMN CHART (Discrete Column Comparison over Time or Categories)
==================================================================== */
export function VerticalColumnChart({ data = [], title = "Volume Breakdown", subtitle = "Column comparison", isCurrency = false, valueKey = "val" }) {
  const [hoveredColumn, setHoveredColumn] = useState(null);

  if (!data || data.length === 0) {
    return (
      <div className="flex h-60 items-center justify-center rounded-2xl border border-white/10 bg-neutral-950 p-6 text-center text-xs text-neutral-500">
        No column data available.
      </div>
    );
  }

  const values = data.map((d) => Number(d[valueKey] || d.val || d.revenue || d.orders || d.unitsSold || 0));
  const maxVal = Math.max(...values, 1);

  const width = 600;
  const height = 200;
  const paddingX = 40;
  const paddingY = 30;

  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingY * 2;

  const barGap = 6;
  const barWidth = Math.max((chartWidth - barGap * (data.length - 1)) / data.length, 6);

  function formatVal(v) {
    if (isCurrency) {
      return "₦" + Number(v || 0).toLocaleString("en-NG");
    }
    return Number(v || 0).toLocaleString("en-NG");
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-neutral-950 p-6 space-y-4">
      <div>
        <h3 className="text-base font-bold text-white">{title}</h3>
        {subtitle && <p className="text-[11px] text-neutral-400 mt-0.5">{subtitle}</p>}
      </div>

      <div className="relative w-full overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto min-w-[400px] overflow-visible">
          {/* Horizontal Gridlines */}
          {[0, 0.5, 1].map((ratio) => {
            const y = height - paddingY - ratio * chartHeight;
            const gridVal = ratio * maxVal;
            return (
              <g key={ratio}>
                <line x1={paddingX} y1={y} x2={width - paddingX} y2={y} stroke="#262626" strokeDasharray="3 3" strokeWidth="1" />
                <text x={paddingX - 6} y={y + 3} fill="#737373" fontSize="8" textAnchor="end">
                  {isCurrency
                    ? gridVal >= 1000000
                      ? `₦${(gridVal / 1000000).toFixed(1)}M`
                      : gridVal >= 1000
                      ? `₦${(gridVal / 1000).toFixed(0)}k`
                      : `₦${Math.round(gridVal)}`
                    : Math.round(gridVal)}
                </text>
              </g>
            );
          })}

          {/* Columns */}
          {data.map((d, idx) => {
            const val = Number(d[valueKey] || d.val || d.revenue || d.orders || d.unitsSold || 0);
            const h = (val / maxVal) * chartHeight;
            const x = paddingX + idx * (barWidth + barGap);
            const y = height - paddingY - h;
            const isHovered = hoveredColumn?.idx === idx;

            return (
              <g key={idx}>
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={Math.max(h, 2)}
                  rx="3"
                  fill={isHovered ? "#fbbf24" : "#f59e0b"}
                  className="transition-all duration-150 cursor-pointer"
                  onMouseEnter={() => setHoveredColumn({ ...d, val, idx, x, y })}
                  onMouseLeave={() => setHoveredColumn(null)}
                />
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip */}
        {hoveredColumn && (
          <div
            className="absolute pointer-events-none z-10 -translate-x-1/2 -translate-y-full rounded-xl border border-white/20 bg-neutral-900/95 px-3 py-2 shadow-2xl backdrop-blur-md"
            style={{
              left: `${((hoveredColumn.x + barWidth / 2) / width) * 100}%`,
              top: `${(hoveredColumn.y / height) * 100 - 6}%`,
            }}
          >
            <p className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold">{hoveredColumn.label || hoveredColumn.name || "Item"}</p>
            <p className="text-xs font-black text-amber-400 mt-0.5">{formatVal(hoveredColumn.val)}</p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-[10px] text-neutral-500 px-1">
        <span>{data[0]?.label || data[0]?.name || ""}</span>
        <span>{data[data.length - 1]?.label || data[data.length - 1]?.name || ""}</span>
      </div>
    </div>
  );
}


/* ====================================================================
   3. HORIZONTAL BAR CHART (Best Sellers / Catalog Item Rankings)
==================================================================== */
export function HorizontalBarChart({ items = [], title, subtitle, isCurrency = true, valueKey = null, hideMetricSelector = false }) {
  const [metric, setMetric] = useState("revenue"); // "revenue" | "unitsSold" | "orders"

  if (!items || items.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-neutral-950 p-6 text-center text-xs text-neutral-500">
        No ranking data available for this section.
      </div>
    );
  }

  const activeKey = valueKey || metric;
  const sortedItems = [...items].sort((a, b) => Number(b[activeKey] || 0) - Number(a[activeKey] || 0));
  const maxVal = Math.max(...sortedItems.map((i) => Number(i[activeKey] || 0)), 1);

  function formatVal(val) {
    if ((activeKey === "revenue" || activeKey === "valuation") && isCurrency) {
      return "₦" + Number(val || 0).toLocaleString("en-NG");
    }
    return Number(val || 0).toLocaleString("en-NG");
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-neutral-950 p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-white">{title || "Performance Rankings"}</h3>
          {subtitle && <p className="text-[11px] text-neutral-400 mt-0.5">{subtitle}</p>}
        </div>

        {!hideMetricSelector && (
          <div className="flex flex-wrap items-center gap-1 rounded-xl border border-white/10 bg-neutral-900 p-1">
            {[
              { key: "revenue", label: "Revenue" },
              { key: "unitsSold", label: "Units Sold" },
              { key: "orders", label: "Orders" },
            ].map((m) => (
              <button
                key={m.key}
                type="button"
                onClick={() => setMetric(m.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  metric === m.key
                    ? "bg-amber-500 text-black shadow"
                    : "text-neutral-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-4">
        {sortedItems.map((item, index) => {
          const val = Number(item[activeKey] || 0);
          const pct = Math.max((val / maxVal) * 100, 2);

          return (
            <div key={item.id || item.name || index} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white truncate max-w-[280px] sm:max-w-[420px]">
                  <span className="text-amber-400 mr-2">{index + 1}.</span>
                  {item.name || "Unnamed"}
                </span>
                <span className="font-black text-amber-400">{formatVal(val)}</span>
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
    </div>
  );
}


/* ====================================================================
   4. DONUT / PIE CHART (Part-to-Whole Share Analysis)
==================================================================== */
export function DonutChart({ items = [], title = "Revenue Share", subtitle = "Distribution share", isCurrency = true }) {
  const [hoveredSlice, setHoveredPoint] = useState(null);

  if (!items || items.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-white/10 bg-neutral-950 p-6 text-center text-xs text-neutral-500">
        No share data available.
      </div>
    );
  }

  const PALETTE = ["#f59e0b", "#3b82f6", "#10b981", "#ec4899", "#8b5cf6", "#f97316", "#06b6d4"];

  const total = items.reduce((acc, item) => acc + Number(item.revenue || item.value || item.unitsSold || 0), 0);
  const safeTotal = total > 0 ? total : 1;

  let cumulativeAngle = 0;

  const slices = items.map((item, idx) => {
    const val = Number(item.revenue || item.value || item.unitsSold || 0);
    const fraction = val / safeTotal;
    const angle = fraction * 360;

    const startAngle = cumulativeAngle;
    const endAngle = cumulativeAngle + angle;
    cumulativeAngle += angle;

    const color = PALETTE[idx % PALETTE.length];

    return {
      ...item,
      val,
      fraction,
      percentage: Math.round(fraction * 100),
      startAngle,
      endAngle,
      color,
    };
  });

  // Utility to convert polar to cartesian coordinates
  function getCoordinatesForAngle(angleInDegrees, radius) {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
      x: 100 + radius * Math.cos(angleInRadians),
      y: 100 + radius * Math.sin(angleInRadians),
    };
  }

  function getSvgPath(startAngle, endAngle, outerRadius = 80, innerRadius = 50) {
    // Large arc flag is 1 if angle > 180
    const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;

    const outerStart = getCoordinatesForAngle(startAngle, outerRadius);
    const outerEnd = getCoordinatesForAngle(endAngle, outerRadius);
    const innerStart = getCoordinatesForAngle(endAngle, innerRadius);
    const innerEnd = getCoordinatesForAngle(startAngle, innerRadius);

    return [
      `M ${outerStart.x} ${outerStart.y}`,
      `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${outerEnd.x} ${outerEnd.y}`,
      `L ${innerStart.x} ${innerStart.y}`,
      `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${innerEnd.x} ${innerEnd.y}`,
      "Z",
    ].join(" ");
  }

  function formatVal(v) {
    if (isCurrency) {
      return "₦" + Number(v || 0).toLocaleString("en-NG");
    }
    return Number(v || 0).toLocaleString("en-NG");
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-neutral-950 p-6 space-y-4">
      <div>
        <h3 className="text-base font-bold text-white">{title}</h3>
        {subtitle && <p className="text-[11px] text-neutral-400 mt-0.5">{subtitle}</p>}
      </div>

      <div className="grid sm:grid-cols-2 items-center gap-6 pt-2">
        <div className="relative flex justify-center">
          <svg viewBox="0 0 200 200" className="w-48 h-48 overflow-visible">
            {slices.map((slice, i) => {
              if (slice.val <= 0) return null;
              const pathD = getSvgPath(slice.startAngle, slice.endAngle - 0.5);

              return (
                <path
                  key={i}
                  d={pathD}
                  fill={slice.color}
                  className="transition-all duration-200 cursor-pointer hover:opacity-80"
                  onMouseEnter={() => setHoveredPoint(slice)}
                  onMouseLeave={() => setHoveredPoint(null)}
                />
              );
            })}
          </svg>

          {/* Center Text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">Total</span>
            <span className="text-xs font-black text-amber-400 mt-0.5">{formatVal(total)}</span>
          </div>
        </div>

        {/* Legend */}
        <div className="space-y-2.5 max-h-48 overflow-y-auto pr-2">
          {slices.map((slice, i) => (
            <div
              key={i}
              className="flex items-center justify-between text-xs p-1.5 rounded-lg transition hover:bg-white/5"
              onMouseEnter={() => setHoveredPoint(slice)}
              onMouseLeave={() => setHoveredPoint(null)}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: slice.color }} />
                <span className="font-semibold text-neutral-300 truncate max-w-[120px]">{slice.name || "Item"}</span>
              </div>
              <div className="text-right shrink-0">
                <span className="font-bold text-white">{slice.percentage}%</span>
                <span className="block text-[9px] text-neutral-500">{formatVal(slice.val)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
