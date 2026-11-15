// lib/fieldStatus.ts
// Shared helper mapping backend soil_moisture telemetry to user-friendly UI display states
// Used by the Fields page (/fields) and the Dashboard (/) — keep it in one place so both are consistent

import { FieldConditions, MoistureDataPoint, SensorReading } from "./types";

export type DisplayMoistureLevel = "good" | "okay" | "dry" | "no_reading" | "error";

export interface FieldMoistureDisplay {
  level: DisplayMoistureLevel;
  label: string; // e.g. "Good", "Okay", "Dry", "No reading yet", "Could not load"
  icon: string; // "✓", "⚠", "!", "—"
  barColor: string; // Tailwind background color class
  badgeBg: string;
  badgeBorder: string;
  textColor: string;
  isStale: boolean;
  staleLabel: string; // "Old reading"
  moisturePercent: number | null; // null if no reading or error
}

/**
 * Groups raw sensor readings by calendar day and computes one average moisture value per day.
 * Returns array of { date, moisture } in chronological order.
 */
export function calculateDailyAverages(readings: SensorReading[]): MoistureDataPoint[] {
  if (!readings || readings.length === 0) return [];

  const buckets = new Map<string, number[]>();
  for (const r of readings) {
    if (r.moisture_percent === null || r.moisture_percent === undefined || isNaN(r.moisture_percent)) {
      continue;
    }
    const dayLabel = new Date(r.time).toLocaleDateString("en-IN", { month: "short", day: "numeric" });
    const existing = buckets.get(dayLabel);
    if (existing) {
      existing.push(r.moisture_percent);
    } else {
      buckets.set(dayLabel, [r.moisture_percent]);
    }
  }

  const result: MoistureDataPoint[] = [];
  for (const [date, values] of buckets) {
    if (values.length === 0) continue;
    result.push({
      date,
      moisture: Math.round(values.reduce((s, v) => s + v, 0) / values.length),
    });
  }
  return result;
}

/**
 * Returns a plain human-readable age string from an ISO timestamp.
 * Examples: "5 minutes ago", "3 hours ago", "2 days ago", "No data".
 * Put here so the Fields page and the Dashboard both use the same wording.
 */
export function timeAgo(isoTimestamp?: string | null): string {
  if (!isoTimestamp) return "No data";
  try {
    const diffMs = Date.now() - new Date(isoTimestamp).getTime();
    if (isNaN(diffMs) || diffMs < 0) return "No data";

    const minutes = Math.floor(diffMs / 60_000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;

    const days = Math.floor(hours / 24);
    return `${days} day${days === 1 ? "" : "s"} ago`;
  } catch {
    return "No data";
  }
}

/**
 * Maps a field's conditions (or error state) to presentation properties for UI cards
 */
export function getFieldMoistureDisplay(
  conditions?: FieldConditions | null,
  isError: boolean = false
): FieldMoistureDisplay {
  // If the conditions call failed for this field
  if (isError) {
    return {
      level: "error",
      label: "Could not load",
      icon: "!",
      barColor: "bg-[#DCD6C0]",
      badgeBg: "bg-[#FEE2E2]",
      badgeBorder: "border-[#FCA5A5]",
      textColor: "text-[#991B1B]",
      isStale: false,
      staleLabel: "",
      moisturePercent: null,
    };
  }

  const moisture = conditions?.soil_moisture;
  const percent = moisture?.moisture_percent ?? null;
  const rawLevel = moisture?.level?.toLowerCase();
  const isStale = moisture?.status === "stale";

  // No sensor reading yet or missing data
  if (percent === null || rawLevel === null || rawLevel === undefined || moisture?.status === "no_data") {
    return {
      level: "no_reading",
      label: "No reading yet",
      icon: "—",
      barColor: "bg-[#DCD6C0]",
      badgeBg: "bg-[#EFEAD8]",
      badgeBorder: "border-[#DCD6C0]",
      textColor: "text-[#5F6E62]",
      isStale: false,
      staleLabel: "",
      moisturePercent: null,
    };
  }

  // Dry level (< 30%)
  if (rawLevel === "dry") {
    return {
      level: "dry",
      label: "Dry",
      icon: "!",
      barColor: "bg-[#DC2626]",
      badgeBg: "bg-[#FEE2E2]",
      badgeBorder: "border-[#FCA5A5]",
      textColor: "text-[#991B1B]",
      isStale,
      staleLabel: "Old reading",
      moisturePercent: Math.round(percent),
    };
  }

  // Okay level (30% - 59%)
  if (rawLevel === "okay") {
    return {
      level: "okay",
      label: "Okay",
      icon: "⚠",
      barColor: "bg-[#D97706]",
      badgeBg: "bg-[#FEF3C7]",
      badgeBorder: "border-[#FCD34D]",
      textColor: "text-[#92400E]",
      isStale,
      staleLabel: "Old reading",
      moisturePercent: Math.round(percent),
    };
  }

  // Good level (>= 60%)
  return {
    level: "good",
    label: "Good",
    icon: "✓",
    barColor: "bg-[#2E7D32]",
    badgeBg: "bg-[#EAF5EB]",
    badgeBorder: "border-[#A3D9A5]",
    textColor: "text-[#1E5128]",
    isStale,
    staleLabel: "Old reading",
    moisturePercent: Math.round(percent),
  };
}
