// Reusable Field Card component
// Displays field name, crop, moisture progress bar with percentage
// Uses triple visual cue: colour + icon + text (Good / Okay / Dry)
// Desktop: 7-day sparkline, and a 2-col x 3-row grid with label on top, value below
// Responsive: Phone & tablet maintain clean compact view

import { STRINGS } from "../lib/strings";
import { Field, MoistureStatus } from "../lib/types";
import Sparkline from "./Sparkline";

interface FieldCardProps {
  field: Field;
}

// Format sowing date as "14 Oct 2026"
function formatSownDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

// Visual configuration for each moisture status
const STATUS_CONFIG: Record<
  MoistureStatus,
  {
    label: string;
    icon: string;
    bulletEmoji: string;
    barColor: string;
    badgeBg: string;
    badgeBorder: string;
    textColor: string;
  }
> = {
  good: {
    label: STRINGS.statusGood,
    icon: "✓",
    bulletEmoji: "🟢",
    barColor: "bg-[#2E7D32]",
    badgeBg: "bg-[#EAF5EB]",
    badgeBorder: "border-[#A3D9A5]",
    textColor: "text-[#1E5128]",
  },
  okay: {
    label: STRINGS.statusOkay,
    icon: "⚠",
    bulletEmoji: "🟡",
    barColor: "bg-[#D97706]",
    badgeBg: "bg-[#FEF3C7]",
    badgeBorder: "border-[#FCD34D]",
    textColor: "text-[#92400E]",
  },
  dry: {
    label: STRINGS.statusDry,
    icon: "!",
    bulletEmoji: "🔴",
    barColor: "bg-[#DC2626]",
    badgeBg: "bg-[#FEE2E2]",
    badgeBorder: "border-[#FCA5A5]",
    textColor: "text-[#991B1B]",
  },
};

export default function FieldCard({ field }: FieldCardProps) {
  const status = STATUS_CONFIG[field.status] || STATUS_CONFIG.good;
  // Ensure percentage stays between 0 and 100
  const clampedPercentage = Math.min(Math.max(field.moisturePercentage, 0), 100);

  return (
    <article className="w-full h-full flex flex-col justify-between bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-[#DCD6C0] hover:shadow-md transition-shadow">
      {/* ── Top section: Header & Progress Bar (shared across all devices) ── */}
      <div>
        {/* Header: Field Name, Crop, and Triple Status Indicator */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl" aria-hidden="true">
              {status.bulletEmoji}
            </span>
            <div>
              <h3 className="text-xl font-semibold text-[#1B2D21] leading-tight">
                {field.name}
              </h3>
              <p className="text-sm text-[#5F6E62] mt-0.5">
                🌾 {field.crop}
              </p>
            </div>
          </div>

          {/* Status Badge: Icon + Word in sentence case */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full border ${status.badgeBg} ${status.badgeBorder} ${status.textColor} shrink-0 text-sm font-semibold`}
          >
            <span aria-hidden="true">{status.icon}</span>
            <span>{status.label}</span>
          </div>
        </div>

        {/* Moisture row with the progress bar */}
        <div className="mt-5 pt-4 border-t border-[#F2EFE4]">
          <div className="flex justify-between items-baseline mb-2">
            <span className="text-sm text-[#5F6E62]">
              {STRINGS.moistureLabel}
            </span>
            <span className="text-xl font-bold text-[#1B2D21]">
              {clampedPercentage}%
            </span>
          </div>

          {/* Progress Bar Container */}
          <div
            role="progressbar"
            aria-valuenow={clampedPercentage}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${field.name} soil moisture ${clampedPercentage}%`}
            className="w-full h-3 bg-[#EFEAD8] rounded-full overflow-hidden border border-[#DCD6C0]"
          >
            <div
              className={`h-full ${status.barColor} transition-all duration-500 rounded-full`}
              style={{ width: `${clampedPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* ── Desktop-only details: flat layout with thin divider lines (hidden on phone & tablet) ── */}
      <div className="hidden lg:flex lg:flex-col gap-3 mt-4">
        {/* 7-day trend as a plain line with label on the left (no box) */}
        <div className="pt-3 border-t border-[#F2EFE4] flex items-center justify-between">
          <span className="text-sm text-[#5F6E62]">7-day trend</span>
          <Sparkline
            data={
              field.history && field.history.length > 0
                ? field.history
                : [60, 62, 65, 68, 70, 75, clampedPercentage]
            }
            width={96}
            height={28}
            color={
              field.status === "dry"
                ? "#DC2626"
                : field.status === "okay"
                  ? "#D97706"
                  : "#2E7D32"
            }
            min={0}
            max={100}
          />
        </div>

        {/* 2-column x 3-row grid: label on top (text-sm muted), value below (text-base semibold) */}
        <div className="pt-3 border-t border-[#F2EFE4] grid grid-cols-2 grid-rows-3 grid-flow-col gap-x-4 gap-y-2.5 text-sm">
          {/* Col 1, Row 1: Sensor */}
          <div>
            <p className="text-sm text-[#5F6E62]">Sensor</p>
            <div className="mt-0.5">
              {field.sensorStatus === "stale" ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-sm font-semibold bg-[#FEF3C7] text-[#92400E] border border-[#FCD34D] whitespace-nowrap">
                  <span aria-hidden="true">⚠</span> Stale
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-sm font-semibold bg-[#EAF5EB] text-[#1E5128] border border-[#A3D9A5] whitespace-nowrap">
                  <span aria-hidden="true">✓</span> Online
                </span>
              )}
            </div>
          </div>

          {/* Col 1, Row 2: Last reading */}
          <div>
            <p className="text-sm text-[#5F6E62]">Last reading</p>
            <p className="text-base font-semibold text-[#1B2D21] whitespace-nowrap">
              {field.lastReadingMinutes !== undefined
                ? `${field.lastReadingMinutes} min ago`
                : "5 min ago"}
            </p>
          </div>

          {/* Col 1, Row 3: Next watering */}
          <div>
            <p className="text-sm text-[#5F6E62]">Next watering</p>
            <p className="text-base font-semibold text-[#1B2D21] whitespace-nowrap">
              {field.nextWateringTime || "6:00 AM"}
            </p>
          </div>

          {/* Col 2, Row 1: Stage */}
          <div>
            <p className="text-sm text-[#5F6E62]">Stage</p>
            <p className="text-base font-semibold text-[#1B2D21] whitespace-nowrap">
              {field.growthStage || "Vegetative · day 32"}
            </p>
          </div>

          {/* Col 2, Row 2: Sown */}
          <div>
            <p className="text-sm text-[#5F6E62]">Sown</p>
            <p className="text-base font-semibold text-[#1B2D21] whitespace-nowrap">
              {field.sownDate ? formatSownDate(field.sownDate) : "14 Oct 2026"}
            </p>
          </div>

          {/* Col 2, Row 3: Area */}
          <div>
            <p className="text-sm text-[#5F6E62]">Area</p>
            <p className="text-base font-semibold text-[#1B2D21] whitespace-nowrap">
              {field.area || "2.5 acres"}
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}
