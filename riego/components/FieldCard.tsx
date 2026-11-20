// Reusable Field Card component
// Displays field name/nickname, crop, soil moisture progress bar, and operational status
// Responsive: compact view on phone/tablet, expanded details on desktop

import { STRINGS } from "../lib/strings";
import { Field, BackendField, FieldConditions } from "../lib/types";
import { getFieldMoistureDisplay, timeAgo } from "../lib/fieldStatus";
import { ClockIcon, EditIcon, MapPinIcon, AlertIcon } from "./icons";
import Sparkline from "./Sparkline";

interface FieldCardProps {
  field: Field | BackendField;
  conditions?: FieldConditions | null;
  conditionsError?: boolean;
  // 7-day daily averages for the sparkline trend (one number per day, oldest first)
  // Undefined or fewer than 2 points → shows "Not enough data yet"
  trendData?: number[];
  placeName?: string | null;
  onEnterReading?: (field: Field | BackendField) => void;
  onChangeLocation?: (field: BackendField) => void;
}

// Format sowing date as "14 Oct 2026"
function formatSownDate(dateStr?: string | null): string {
  if (!dateStr) return "Not sown yet";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export default function FieldCard({
  field,
  conditions,
  conditionsError,
  trendData,
  placeName,
  onEnterReading,
  onChangeLocation,
}: FieldCardProps) {
  // Determine if this is a real BackendField or legacy mock Field
  const isBackend = "latitude" in field || "registered_at" in field;

  // Check if field is still on the legacy placeholder coordinates (13.0827, 77.5877)
  const isPlaceholderLocation =
    isBackend &&
    Math.abs((field as BackendField).latitude - 13.0827) < 0.0001 &&
    Math.abs((field as BackendField).longitude - 77.5877) < 0.0001;
  
  // Field display metadata
  const fieldName = (isBackend && (field as BackendField).nickname?.trim())
    ? (field as BackendField).nickname!
    : ("name" in field ? field.name : `Field ${field.id}`);

  const crop = field.crop;
  const areaText = isBackend
    ? `${(field as BackendField).area} ${(field as BackendField).area_unit}`
    : (field as Field).area || "2.5 acres";

  const growthStageText = isBackend
    ? ((field as BackendField).growth_stage || "Planning stage")
    : (field as Field).growthStage || "Vegetative";

  const sownDateText = formatSownDate(
    isBackend ? (field as BackendField).sowing_date : (field as Field).sownDate
  );

  const hasSensor = isBackend
    ? (field as BackendField).has_sensor
    : Boolean((field as Field).sensorStatus);

  // Check if current reading source is manual
  const isManual =
    conditions?.soil_moisture?.source === "manual" ||
    (conditions?.soil_moisture?.device_id || "").startsWith("manual-");

  // Device ID: show "—" when null/undefined/the literal string "null" instead of the text "null"
  const rawDeviceId = isBackend ? (field as BackendField).device_id : null;
  const deviceIdText = rawDeviceId && rawDeviceId !== "null" ? rawDeviceId : "—";

  // Status computation via shared fieldStatus helper
  const status = isBackend || conditions !== undefined || conditionsError
    ? getFieldMoistureDisplay(conditions, conditionsError)
    : {
        level: (field as Field).status || "good",
        label: (field as Field).status === "dry" ? STRINGS.statusDry : (field as Field).status === "okay" ? STRINGS.statusOkay : STRINGS.statusGood,
        icon: (field as Field).status === "dry" ? "!" : (field as Field).status === "okay" ? "⚠" : "✓",
        barColor: (field as Field).status === "dry" ? "bg-[#DC2626]" : (field as Field).status === "okay" ? "bg-[#D97706]" : "bg-[#2E7D32]",
        badgeBg: (field as Field).status === "dry" ? "bg-[#FEE2E2]" : (field as Field).status === "okay" ? "bg-[#FEF3C7]" : "bg-[#EAF5EB]",
        badgeBorder: (field as Field).status === "dry" ? "border-[#FCA5A5]" : (field as Field).status === "okay" ? "border-[#FCD34D]" : "border-[#A3D9A5]",
        textColor: (field as Field).status === "dry" ? "text-[#991B1B]" : (field as Field).status === "okay" ? "text-[#92400E]" : "text-[#1E5128]",
        isStale: false,
        staleLabel: "",
        moisturePercent: (field as Field).moisturePercentage ?? 65,
      };

  const hasPercent = status.moisturePercent !== null;
  const clampedPercentage = hasPercent ? Math.min(Math.max(status.moisturePercent!, 0), 100) : 0;

  // Trend: use real trendData if passed and has at least 2 points; otherwise no chart
  const hasTrend = trendData && trendData.length >= 2;
  const sparklineColor =
    status.level === "dry"
      ? "#DC2626"
      : status.level === "okay"
        ? "#D97706"
        : status.level === "good"
          ? "#2E7D32"
          : "#5F6E62";

  // "Last reading" real age string from conditions timestamp
  const lastReadingText = timeAgo(conditions?.soil_moisture?.measured_at);

  return (
    <article className="w-full h-full flex flex-col justify-between bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-[#DCD6C0] hover:shadow-md transition-shadow">
      {/* ── Top section: Header & Progress Bar ── */}
      <div>
        {/* Header: Field Name, Crop, and Status Badges */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-[#FAF7EE] border border-[#DCD6C0] flex items-center justify-center text-sm font-bold text-[#235334] shrink-0">
              {String(field.id).slice(-3)}
            </div>
            <div className="min-w-0">
              <h3 className="text-xl font-semibold text-[#1B2D21] leading-tight truncate">
                {fieldName}
              </h3>
              <p className="text-sm text-[#5F6E62] mt-0.5">
                {crop}
              </p>
              {isPlaceholderLocation ? (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#FEF3C7] border border-[#FCD34D] text-[#92400E] text-xs font-semibold mt-1.5">
                  <AlertIcon className="w-3.5 h-3.5 text-[#92400E] shrink-0" />
                  <span>Location not set</span>
                </div>
              ) : placeName ? (
                <div className="flex items-center gap-1 text-xs text-[#5F6E62] mt-1 truncate">
                  <MapPinIcon className="w-3.5 h-3.5 text-[#5F6E62] shrink-0" />
                  <span className="truncate">{placeName}</span>
                </div>
              ) : null}
            </div>
          </div>

          {/* Status Badges: Level badge & optional Old Reading badge */}
          <div className="flex flex-col items-end gap-1 shrink-0">
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full border ${status.badgeBg} ${status.badgeBorder} ${status.textColor} text-sm font-semibold`}
            >
              <span aria-hidden="true">{status.icon}</span>
              <span>{status.label}</span>
            </div>

            {status.isStale && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-[#FEF3C7] text-[#92400E] border border-[#FCD34D]">
                <ClockIcon className="w-3 h-3" />
                <span>Old reading</span>
              </span>
            )}
          </div>
        </div>

        {/* Moisture row with progress bar */}
        <div className="mt-5 pt-4 border-t border-[#F2EFE4]">
          <div className="flex justify-between items-baseline mb-2">
            <span className="text-sm text-[#5F6E62]">
              {STRINGS.moistureLabel}
            </span>
            <span className="text-xl font-bold text-[#1B2D21]">
              {hasPercent ? (
                `${clampedPercentage}%`
              ) : status.level === "no_reading" ? (
                <span className="text-sm font-semibold text-[#5F6E62]">No reading yet</span>
              ) : (
                <span className="text-sm font-semibold text-[#991B1B]">Could not load</span>
              )}
            </span>
          </div>

          {/* Progress Bar Container */}
          <div
            role="progressbar"
            aria-valuenow={hasPercent ? clampedPercentage : 0}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${fieldName} soil moisture ${hasPercent ? clampedPercentage + "%" : "unavailable"}`}
            className="w-full h-3 bg-[#EFEAD8] rounded-full overflow-hidden border border-[#DCD6C0]"
          >
            <div
              className={`h-full ${status.barColor} transition-all duration-500 rounded-full`}
              style={{ width: `${hasPercent ? clampedPercentage : 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* ── Desktop-only details ── */}
      <div className="hidden lg:flex lg:flex-col gap-3 mt-4">
        {/* 7-day trend sparkline — real sensor history averaged per day */}
        <div className="pt-3 border-t border-[#F2EFE4] flex items-center justify-between">
          <span className="text-sm text-[#5F6E62]">7-day trend</span>
          {hasTrend ? (
            <Sparkline
              data={trendData!}
              width={96}
              height={28}
              color={sparklineColor}
              min={0}
              max={100}
            />
          ) : (
            <span className="flex items-center gap-1 text-xs text-[#5F6E62]">
              <ClockIcon className="w-3.5 h-3.5" />
              Not enough data yet
            </span>
          )}
        </div>

        {/* 2-column x 3-row detail grid */}
        <div className="pt-3 border-t border-[#F2EFE4] grid grid-cols-2 grid-rows-3 grid-flow-col gap-x-4 gap-y-2.5 text-sm">
          {/* Sensor status */}
          <div>
            <p className="text-sm text-[#5F6E62]">Sensor</p>
            <div className="mt-0.5">
              {isManual ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-sm font-semibold bg-[#EAF5EB] text-[#1E5128] border border-[#A3D9A5] whitespace-nowrap">
                  <EditIcon className="w-3.5 h-3.5" />
                  <span>Manual</span>
                </span>
              ) : !hasSensor ? (
                <span className="text-sm text-[#5F6E62] font-medium">None</span>
              ) : status.isStale ? (
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

          {/* Last reading — real age from measured_at timestamp */}
          <div>
            <p className="text-sm text-[#5F6E62]">Last reading</p>
            <p className="text-base font-semibold text-[#1B2D21] whitespace-nowrap">
              {lastReadingText}
            </p>
          </div>

          {/* Sowing date */}
          <div>
            <p className="text-sm text-[#5F6E62]">Sown</p>
            <p className="text-base font-semibold text-[#1B2D21] whitespace-nowrap">
              {sownDateText}
            </p>
          </div>

          {/* Crop stage */}
          <div>
            <p className="text-sm text-[#5F6E62]">Stage</p>
            <p className="text-base font-semibold text-[#1B2D21] whitespace-nowrap">
              {growthStageText}
            </p>
          </div>

          {/* Area */}
          <div>
            <p className="text-sm text-[#5F6E62]">Area</p>
            <p className="text-base font-semibold text-[#1B2D21] whitespace-nowrap">
              {areaText}
            </p>
          </div>

          {/* Device ID — shows "—" when null, never shows the text "null" */}
          <div>
            <p className="text-sm text-[#5F6E62]">Device</p>
            <p className="text-base font-semibold text-[#1B2D21] whitespace-nowrap">
              {deviceIdText}
            </p>
          </div>
        </div>
      </div>

      {/* ── Fields page action: Change location & Enter reading buttons (>=56px tall) ── */}
      {(onEnterReading || (onChangeLocation && isBackend)) && (
        <div className="pt-4 mt-4 border-t border-[#F2EFE4] flex flex-col gap-2.5">
          {onChangeLocation && isBackend && (
            <button
              type="button"
              onClick={() => onChangeLocation(field as BackendField)}
              className="w-full min-h-[56px] rounded-2xl bg-[#FAF7EE] hover:bg-[#F2EDDC] active:scale-95 border border-[#DCD6C0] text-[#235334] font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <MapPinIcon className="w-5 h-5 text-[#235334]" />
              <span>Change location</span>
            </button>
          )}

          {onEnterReading && (
            <button
              type="button"
              onClick={() => onEnterReading(field)}
              className="w-full min-h-[56px] rounded-2xl bg-[#FAF7EE] hover:bg-[#F2EDDC] active:scale-95 border border-[#DCD6C0] text-[#235334] font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <EditIcon className="w-5 h-5 text-[#235334]" />
              <span>Enter reading</span>
            </button>
          )}
        </div>
      )}
    </article>
  );
}
