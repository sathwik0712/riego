// Reusable Sparkline component using inline SVG (zero external packages)
// Visualizes 7-day trends cleanly inside tiles and cards

import { MoistureDataPoint } from "../lib/types";

interface SparklineProps {
  data: number[] | MoistureDataPoint[];
  width?: number;
  height?: number;
  color?: string;
  fillOpacity?: number;
  className?: string;
  min?: number;
  max?: number;
}

export default function Sparkline({
  data,
  width = 80,
  height = 28,
  color = "#0E7490",
  fillOpacity = 0.15,
  className = "",
  min,
  max,
}: SparklineProps) {
  // Extract numerical values
  const values = data.map((d) => (typeof d === "number" ? d : d.moisture));
  if (values.length < 2) return null;

  const effectiveMin = min !== undefined ? min : Math.min(...values);
  const effectiveMax = max !== undefined ? max : Math.max(...values);
  const range = effectiveMax - effectiveMin || 1;

  const padX = 2;
  const padY = 3;
  const usableW = width - padX * 2;
  const usableH = height - padY * 2;

  const points = values.map((val, idx) => {
    const x = padX + (idx / (values.length - 1)) * usableW;
    const clampedVal = Math.min(Math.max(val, effectiveMin), effectiveMax);
    const y = height - padY - ((clampedVal - effectiveMin) / range) * usableH;
    return { x, y };
  });

  const pathD = points.reduce(
    (acc, pt, i) => `${acc} ${i === 0 ? "M" : "L"} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`,
    ""
  );

  const lastPt = points[points.length - 1];
  const firstPt = points[0];
  const areaD = `${pathD} L ${lastPt.x.toFixed(1)} ${(height - padY).toFixed(1)} L ${firstPt.x.toFixed(1)} ${(height - padY).toFixed(1)} Z`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={`overflow-visible ${className}`}
      aria-hidden="true"
    >
      {fillOpacity > 0 && <path d={areaD} fill={color} fillOpacity={fillOpacity} />}
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={lastPt.x} cy={lastPt.y} r={2.5} fill={color} />
    </svg>
  );
}

