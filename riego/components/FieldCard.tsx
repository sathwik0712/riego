// Reusable Field Card component
// Displays field name, crop, moisture progress bar with percentage
// Uses triple visual cue: colour + icon + text (Good / Okay / Dry)

import { STRINGS } from "../lib/strings";
import { Field, MoistureStatus } from "../lib/types";

interface FieldCardProps {
  field: Field;
}

// Visual configuration for each moisture status
const STATUS_CONFIG: Record<
  MoistureStatus,
  {
    label: string;
    icon: string;
    barColor: string;
    badgeBg: string;
    badgeBorder: string;
    textColor: string;
    bulletEmoji: string;
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
    <article className="w-full bg-[#FFFFFF] rounded-2xl p-4 sm:p-5 shadow-sm border border-[#DCD6C0]">
      {/* Header: Field Name, Crop, and Triple Status Indicator */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="text-xl" aria-hidden="true">
            {status.bulletEmoji}
          </span>
          <div>
            <h3 className="text-xl font-bold text-[#1B2D21] leading-tight">
              {field.name}
            </h3>
            <p className="text-sm font-semibold text-[#5F6E62]">
              🌾 {field.crop}
            </p>
          </div>
        </div>

        {/* Status Badge: Icon + Word */}
        <div
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${status.badgeBg} ${status.badgeBorder} ${status.textColor}`}
        >
          <span className="font-extrabold text-sm" aria-hidden="true">
            {status.icon}
          </span>
          <span className="text-sm font-bold uppercase tracking-wide">
            {status.label}
          </span>
        </div>
      </div>

      {/* Soil Moisture Bar */}
      <div className="mt-4">
        <div className="flex justify-between items-baseline mb-1.5">
          <span className="text-sm font-semibold text-[#3D4D41]">
            {STRINGS.moistureLabel}
          </span>
          <span className="text-lg font-black text-[#1B2D21]">
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
          className="w-full h-4 bg-[#EFEAD8] rounded-full overflow-hidden border border-[#DCD6C0]"
        >
          <div
            className={`h-full ${status.barColor} transition-all duration-500 rounded-full`}
            style={{ width: `${clampedPercentage}%` }}
          />
        </div>
      </div>
    </article>
  );
}

