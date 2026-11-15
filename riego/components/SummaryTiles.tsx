// SummaryTiles — desktop-only stats row (hidden on phone & tablet)
// Compact layout: p-5 padding, 48px icon box, text-4xl big number, label, and exactly one helper line
// Status word pill in top right; moisture sparkline enlarged to 96x32px

import { Alert, MoistureHistory, SummaryStats } from "../lib/types";
import { BellIcon, CloudRainIcon, DropIcon, SignalIcon } from "./icons";
import Sparkline from "./Sparkline";

interface SummaryTilesProps {
  stats: SummaryStats;
  history?: MoistureHistory[];
  alerts?: Alert[];
}

export default function SummaryTiles({ stats, history }: SummaryTilesProps) {
  const { averageMoisture, rainChance, activeAlerts, sensorsOnline, sensorsTotal } = stats;

  const sensorsOffline = sensorsTotal - sensorsOnline;
  const moistureLow = averageMoisture < 40;
  const hasAlerts = activeAlerts > 0;

  // 7-day moisture trend calculation across all fields for the sparkline
  const moistureTrend =
    history && history.length > 0
      ? history[0].data.map((_, dayIdx) => {
          const sum = history.reduce((acc, h) => acc + (h.data[dayIdx]?.moisture || 0), 0);
          return Math.round(sum / history.length);
        })
      : [57, 50, 54, 57, 57, 49, 41];

  return (
    // Hidden on phone & tablet; 4-column grid on desktop only with gap-4
    <section
      aria-label="Farm summary statistics"
      className="hidden lg:grid lg:grid-cols-4 gap-4"
    >
      {/* ── Tile 1: Average Moisture (blue-green accent) ───────────────── */}
      <div className="h-full flex flex-col justify-between bg-white rounded-3xl p-5 shadow-sm border border-[#DCD6C0] border-t-4 border-t-[#0E7490] hover:shadow-md transition-shadow">
        {/* Top row: 48px icon box + 96x32px sparkline */}
        <div className="flex items-center justify-between">
          <div className="w-12 h-12 rounded-2xl bg-[#ECFEFF] flex items-center justify-center text-[#0E7490] shrink-0">
            <DropIcon className="w-6 h-6" />
          </div>
          <Sparkline
            data={moistureTrend}
            width={96}
            height={32}
            color="#0E7490"
            min={0}
            max={100}
          />
        </div>

        {/* Big number + Low badge + vs-yesterday text */}
        <div className="flex items-baseline gap-2 mt-2.5">
          <span className="text-4xl font-bold text-[#1B2D21]">
            {averageMoisture}%
          </span>
          {moistureLow && (
            <span className="text-sm font-semibold text-[#DC2626] bg-[#FEE2E2] px-2.5 py-0.5 rounded-full border border-[#FCA5A5]">
              Low
            </span>
          )}
          <span className="text-sm text-[#5F6E62] whitespace-nowrap">
            ↓ 6% vs yesterday
          </span>
        </div>

        {/* Label & exactly one helper line */}
        <div className="mt-1.5">
          <p className="text-base font-semibold text-[#1B2D21]">Average moisture</p>
          <p className="text-sm text-[#5F6E62] mt-0.5">Target 40-70%</p>
        </div>
      </div>

      {/* ── Tile 2: Rain Chance (sky-blue accent) ──────────────────────── */}
      <div className="h-full flex flex-col justify-between bg-white rounded-3xl p-5 shadow-sm border border-[#DCD6C0] border-t-4 border-t-[#0369A1] hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <div className="w-12 h-12 rounded-2xl bg-[#EFF6FF] flex items-center justify-center text-[#0369A1] shrink-0">
            <CloudRainIcon className="w-6 h-6" />
          </div>
          <span className="text-sm font-semibold text-[#0369A1] bg-[#EFF6FF] px-3 py-1 rounded-full border border-[#BAE6FD]">
            Rain-safe
          </span>
        </div>

        <div className="flex items-baseline gap-2 mt-2.5">
          <span className="text-4xl font-bold text-[#1B2D21]">{rainChance}%</span>
        </div>

        <div className="mt-1.5">
          <p className="text-base font-semibold text-[#1B2D21]">Rain chance</p>
          <p className="text-sm text-[#5F6E62] mt-0.5">Next 24 hours</p>
        </div>
      </div>

      {/* ── Tile 3: Active Alerts (amber accent) ───────────────────────── */}
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

      {/* ── Tile 4: Sensors Online (green accent) ──────────────────────── */}
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
            {sensorsOffline > 0 ? "1 offline" : "All online"}
          </p>
        </div>
      </div>
    </section>
  );
}
