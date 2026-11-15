// SummaryTiles — desktop-only stats row (hidden on phone & tablet)
// Compact layout: p-5 padding, 48px icon box, text-4xl big number, label, and exactly one helper line
// Now computed from real backend data where possible; sample-only values are marked with comments

import { FieldConditions, BackendField } from "../lib/types";
import { getFieldMoistureDisplay } from "../lib/fieldStatus";
import { BellIcon, CloudRainIcon, DropIcon, SignalIcon } from "./icons";
import Sparkline from "./Sparkline";

interface SummaryTilesProps {
  fields: BackendField[];
  conditionsByFieldId: Record<number, FieldConditions>;
  // Daily moisture averages for the sparkline (one per day, oldest first)
  moistureTrend?: number[];
}

export default function SummaryTiles({ fields, conditionsByFieldId, moistureTrend }: SummaryTilesProps) {
  // ── Tile 1: Average Moisture — computed from real conditions ──
  const fieldsWithMoisture = fields
    .map((f) => conditionsByFieldId[f.id]?.soil_moisture?.moisture_percent)
    .filter((v): v is number => v !== null && v !== undefined);

  const averageMoisture =
    fieldsWithMoisture.length > 0
      ? Math.round(fieldsWithMoisture.reduce((s, v) => s + v, 0) / fieldsWithMoisture.length)
      : 0;
  const moistureLow = averageMoisture < 40;

  // Sparkline: use real trend if available, otherwise a flat line
  const sparkData = moistureTrend && moistureTrend.length >= 2 ? moistureTrend : [averageMoisture];

  // ── Tile 2: Rain — real weather from the first field's conditions ──
  const firstConditions = fields.length > 0 ? conditionsByFieldId[fields[0].id] : null;
  const rainExpectedSoon = firstConditions?.weather?.rain_expected_soon ?? false;
  const rainTotalMm = firstConditions?.weather?.rain_total_mm_next_2_days ?? 0;
  // Show "Rain expected" or "Rain-safe" based on actual forecast
  const rainStatusText = rainExpectedSoon ? "Rain expected" : "Rain-safe";
  const rainStatusColor = rainExpectedSoon
    ? "bg-[#FEF3C7] text-[#92400E] border-[#FCD34D]"
    : "bg-[#EFF6FF] text-[#0369A1] border-[#BAE6FD]";

  // ── Tile 3: Active Alerts — sample data (connects to alert engine in a later step) ──
  // TODO: replace with real alert count when the alert engine is built
  const activeAlerts = 2;
  const hasAlerts = activeAlerts > 0;

  // ── Tile 4: Sensors Online — computed from real fields ──
  const sensorsTotal = fields.filter((f) => f.has_sensor).length;
  const sensorsOnline = fields.filter((f) => {
    if (!f.has_sensor) return false;
    const c = conditionsByFieldId[f.id];
    // Online if we have a reading and it is not stale
    return c && c.soil_moisture?.status !== "stale" && c.soil_moisture?.status !== "no_data";
  }).length;
  const sensorsOffline = sensorsTotal - sensorsOnline;

  return (
    // Hidden on phone & tablet; 4-column grid on desktop only with gap-4
    <section
      aria-label="Farm summary statistics"
      className="hidden lg:grid lg:grid-cols-4 gap-4"
    >
      {/* ── Tile 1: Average Moisture (blue-green accent) ───────────────── */}
      <div className="h-full flex flex-col justify-between bg-white rounded-3xl p-5 shadow-sm border border-[#DCD6C0] border-t-4 border-t-[#0E7490] hover:shadow-md transition-shadow">
        {/* Top row: 48px icon box + sparkline */}
        <div className="flex items-center justify-between">
          <div className="w-12 h-12 rounded-2xl bg-[#ECFEFF] flex items-center justify-center text-[#0E7490] shrink-0">
            <DropIcon className="w-6 h-6" />
          </div>
          {sparkData.length >= 2 && (
            <Sparkline
              data={sparkData}
              width={96}
              height={32}
              color="#0E7490"
              min={0}
              max={100}
            />
          )}
        </div>

        {/* Big number + Low badge */}
        <div className="flex items-baseline gap-2 mt-2.5">
          <span className="text-4xl font-bold text-[#1B2D21]">
            {averageMoisture}%
          </span>
          {moistureLow && (
            <span className="text-sm font-semibold text-[#DC2626] bg-[#FEE2E2] px-2.5 py-0.5 rounded-full border border-[#FCA5A5]">
              Low
            </span>
          )}
        </div>

        {/* Label & helper line */}
        <div className="mt-1.5">
          <p className="text-base font-semibold text-[#1B2D21]">Average moisture</p>
          <p className="text-sm text-[#5F6E62] mt-0.5">Target 40-70%</p>
        </div>
      </div>

      {/* ── Tile 2: Rain (sky-blue accent) — real weather data ─────────── */}
      <div className="h-full flex flex-col justify-between bg-white rounded-3xl p-5 shadow-sm border border-[#DCD6C0] border-t-4 border-t-[#0369A1] hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <div className="w-12 h-12 rounded-2xl bg-[#EFF6FF] flex items-center justify-center text-[#0369A1] shrink-0">
            <CloudRainIcon className="w-6 h-6" />
          </div>
          <span className={`text-sm font-semibold px-3 py-1 rounded-full border ${rainStatusColor}`}>
            {rainStatusText}
          </span>
        </div>

        <div className="flex items-baseline gap-2 mt-2.5">
          <span className="text-4xl font-bold text-[#1B2D21]">
            {rainTotalMm > 0 ? `${rainTotalMm.toFixed(0)} mm` : "0 mm"}
          </span>
        </div>

        <div className="mt-1.5">
          <p className="text-base font-semibold text-[#1B2D21]">Rain forecast</p>
          <p className="text-sm text-[#5F6E62] mt-0.5">Next 2 days</p>
        </div>
      </div>

      {/* ── Tile 3: Active Alerts (amber accent) — sample data ─────────── */}
      {/* TODO: Connect to real alert engine when built */}
      <div className="h-full flex flex-col justify-between bg-white rounded-3xl p-5 shadow-sm border border-[#DCD6C0] border-t-4 border-t-[#D97706] hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <div className="w-12 h-12 rounded-2xl bg-[#FFFBEB] flex items-center justify-center text-[#D97706] shrink-0">
            <BellIcon className="w-6 h-6" />
          </div>
          {hasAlerts && (
            <span className="text-sm font-semibold text-[#92400E] bg-[#FEF3C7] px-3 py-1 rounded-full border border-[#FCD34D]">
              Check
            </span>
          )}
        </div>

        <div className="flex items-baseline gap-2 mt-2.5">
          <span className="text-4xl font-bold text-[#1B2D21]">{activeAlerts}</span>
        </div>

        <div className="mt-1.5">
          <p className="text-base font-semibold text-[#1B2D21]">Active alerts</p>
          <p className="text-sm text-[#5F6E62] mt-0.5">1 critical · 1 warning</p>
        </div>
      </div>

      {/* ── Tile 4: Sensors Online (green accent) — computed from real fields ── */}
      <div className="h-full flex flex-col justify-between bg-white rounded-3xl p-5 shadow-sm border border-[#DCD6C0] border-t-4 border-t-[#16A34A] hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <div className="w-12 h-12 rounded-2xl bg-[#F0FDF4] flex items-center justify-center text-[#16A34A] shrink-0">
            <SignalIcon className="w-6 h-6" />
          </div>
          <span
            className={`text-sm font-semibold px-3 py-1 rounded-full border ${
              sensorsOffline > 0
                ? "bg-[#FEF3C7] text-[#92400E] border-[#FCD34D]"
                : "bg-[#EAF5EB] text-[#1E5128] border-[#A3D9A5]"
            }`}
          >
            {sensorsOffline > 0 ? `${sensorsOffline} offline` : "All online"}
          </span>
        </div>

        <div className="flex items-baseline gap-2 mt-2.5">
          <span className="text-4xl font-bold text-[#1B2D21]">
            {sensorsOnline} / {sensorsTotal}
          </span>
        </div>

        <div className="mt-1.5">
          <p className="text-base font-semibold text-[#1B2D21]">Sensors online</p>
          <p className="text-sm text-[#5F6E62] mt-0.5">
            {sensorsOffline > 0 ? `${sensorsOffline} offline` : "All online"}
          </p>
        </div>
      </div>
    </section>
  );
}
