"use client";

import { useState } from "react";

export default function AnalyticsCharts({ dailyData = [] }) {
  const [metric, setMetric] = useState("revenue"); // "revenue" | "orders" | "unitsSold"
  const [hoveredPoint, setHoveredPoint] = useState(null);

  if (!dailyData || dailyData.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-white/10 bg-neutral-950 p-6 text-center text-xs text-neutral-500">
        No chart data available for the selected range.
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
  const minVal = 0;

  const width = 800;
  const height = 240;
  const paddingX = 40;
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
    <div className="rounded-2xl border border-white/10 bg-neutral-950 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-base font-bold text-white">Sales Performance</h3>
          <p className="text-[11px] text-neutral-400 mt-0.5">
            Daily breakdown over selected period
          </p>
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
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto min-w-[500px] overflow-visible"
        >
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
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
                <line
                  x1={paddingX}
                  y1={y}
                  x2={width - paddingX}
                  y2={y}
                  stroke="#262626"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
                <text
                  x={paddingX - 8}
                  y={y + 3}
                  fill="#737373"
                  fontSize="9"
                  textAnchor="end"
                >
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

          {/* Area under curve */}
          <path d={areaD} fill="url(#chartGradient)" />

          {/* Line path */}
          <path
            d={pathD}
            fill="none"
            stroke="#f59e0b"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data points */}
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

        {/* Hover Tooltip */}
        {hoveredPoint && (
          <div
            className="absolute pointer-events-none z-10 -translate-x-1/2 -translate-y-full rounded-xl border border-white/20 bg-neutral-900/95 px-3 py-2 shadow-2xl backdrop-blur-md"
            style={{
              left: `${(hoveredPoint.x / width) * 100}%`,
              top: `${(hoveredPoint.y / height) * 100 - 8}%`,
            }}
          >
            <p className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold">
              {hoveredPoint.label}
            </p>
            <p className="text-xs font-black text-amber-400 mt-0.5">
              {formatValue(hoveredPoint.val)}
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-[10px] text-neutral-500 mt-2 px-2">
        <span>{dailyData[0]?.label || ""}</span>
        <span>{dailyData[dailyData.length - 1]?.label || ""}</span>
      </div>
    </div>
  );
}
