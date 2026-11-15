// lib/fieldStatus.ts
// Shared helper mapping backend soil_moisture telemetry to user-friendly UI display states
// Used by the Fields page (/fields) and reused by the Dashboard (/) in later steps

import { FieldConditions } from "./types";

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
