"use client";

// Moisture trend chart for desktop Home page
// Displays 7-day soil moisture history for all fields with target band
// Color is not the only signal: uses distinct line styles (solid, dashed, dotted)
// Chart area fills remaining height with legend pinned at the bottom

import { useEffect, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Field, BackendField, MoistureHistory, MoistureTarget } from "../lib/types";

interface MoistureChartProps {
  history: MoistureHistory[];
  target: MoistureTarget;
  fields: (Field | BackendField)[];
}

// Preset visual styles for field lines
const FIELD_STYLES = [
  { color: "#2E7D32", strokeDasharray: undefined, styleLabel: "Solid" },
  { color: "#DC2626", strokeDasharray: "6 4", styleLabel: "Dashed" },
  { color: "#D97706", strokeDasharray: "2 3", styleLabel: "Dotted" },
];

export default function MoistureChart({
  history,
  target,
  fields,
}: MoistureChartProps) {
  // Client mount flag to prevent SSR hydration discrepancies with Recharts
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Map field id to field data for crop name and label
  const fieldMap = new Map(fields.map((f) => [String(f.id), f]));

  // Build field configs with style metadata
  const configs = history.map((h, index) => {
    const style = FIELD_STYLES[index % FIELD_STYLES.length];
    const field = fieldMap.get(String(h.fieldId));
    const fieldName = (field && "nickname" in field && field.nickname) ? field.nickname : (field && "name" in field ? field.name : `Field ${index + 1}`);
    return {
      fieldId: h.fieldId,
      name: fieldName,
      crop: field?.crop || "Crop",
      color: style.color,
      strokeDasharray: style.strokeDasharray,
      styleLabel: style.styleLabel,
    };
  });

  // Transform data points into Recharts row structure: [{ date: "Nov 9", "fld-1": 80, ... }]
  const chartData = (history[0]?.data || []).map((point, index) => {
    const row: Record<string, string | number> = { date: point.date };
    history.forEach((h) => {
      row[h.fieldId] = h.data[index]?.moisture ?? 0;
    });
    return row;
  });

  return (
    <div className="bg-white rounded-3xl p-6 border border-[#DCD6C0] shadow-sm flex flex-col justify-between h-full">
      {/* Header */}
      <div>
        <h3 className="text-xl font-semibold text-[#1B2D21] leading-tight">
          Moisture trend
        </h3>
        <p className="text-sm text-[#5F6E62] mt-0.5">Last 7 days</p>
      </div>

      {/* Chart container grows to fill remaining height (flex-1, min-h-[300px]) */}
      <div className="w-full flex-1 min-h-[300px] mt-4 mb-2">
        {isMounted ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 12, right: 12, left: -16, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#F2EFE4"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                stroke="#5F6E62"
                tick={{ fill: "#5F6E62", fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: "#DCD6C0" }}
              />
              <YAxis
                domain={[0, 100]}
                ticks={[0, 20, 40, 60, 80, 100]}
                tickFormatter={(val) => `${val}%`}
                stroke="#5F6E62"
                tick={{ fill: "#5F6E62", fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: "#DCD6C0" }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#FFFFFF",
                  borderColor: "#DCD6C0",
                  borderRadius: "1rem",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                  fontSize: "0.875rem",
                }}
                formatter={(val: any, name: any) => {
                  const cfg = configs.find((c) => c.fieldId === name);
                  return [`${val}%`, cfg ? `${cfg.name} (${cfg.crop})` : name];
                }}
              />
              {/* Shaded target moisture band */}
              <ReferenceArea
                y1={target.min}
                y2={target.max}
                fill="#2E7D32"
                fillOpacity={0.08}
                label={{
                  value: `Target ${target.min}-${target.max}%`,
                  position: "insideTopRight",
                  fill: "#5F6E62",
                  fontSize: 12,
                }}
              />
              {configs.map((cfg) => (
                <Line
                  key={cfg.fieldId}
                  type="monotone"
                  dataKey={cfg.fieldId}
                  name={cfg.fieldId}
                  stroke={cfg.color}
                  strokeWidth={2.5}
                  strokeDasharray={cfg.strokeDasharray}
                  dot={{ r: 3, fill: cfg.color }}
                  activeDot={{ r: 5 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-sm text-[#5F6E62]">
            Loading moisture trend...
          </div>
        )}
      </div>

      {/* Legend pinned at the bottom of the card */}
      <div className="flex flex-wrap items-center justify-center gap-6 pt-3 border-t border-[#F2EFE4] mt-auto">
        {configs.map((cfg) => (
          <div
            key={cfg.fieldId}
            className="flex items-center gap-2 text-sm text-[#1B2D21]"
          >
            <svg className="w-6 h-3" aria-hidden="true">
              <line
                x1="0"
                y1="6"
                x2="24"
                y2="6"
                stroke={cfg.color}
                strokeWidth="3"
                strokeDasharray={cfg.strokeDasharray}
              />
            </svg>
            <span className="font-semibold">{cfg.name}</span>
            <span className="text-[#5F6E62]">({cfg.crop})</span>
            <span className="text-xs font-medium text-[#5F6E62] bg-[#F4F1E8] px-1.5 py-0.5 rounded border border-[#DCD6C0]">
              {cfg.styleLabel}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
