"use client";

// WeatherStrip component
// Shows live weather from the first field's conditions response.
// Falls back to "Weather not available right now" with an icon if unavailable.
// Rounded-3xl, p-5 sm:p-6, 4-tier type scale, line icons only (no emoji).

import { CloudRainIcon, DropIcon, SunIcon, AlertIcon } from "./icons";

// Weather data shape from FieldConditions.weather.current
interface LiveWeather {
  temperature_c: number;
  humidity_percent: number;
  rain_mm_last_hour?: number;
  is_raining?: boolean;
}

interface WeatherStripProps {
  // available = false means weather could not be fetched
  available: boolean;
  current?: LiveWeather | null;
  rainExpectedSoon?: boolean | null;
  rainTotalMmNext2Days?: number | null;
}

export default function WeatherStrip({
  available,
  current,
  rainExpectedSoon,
  rainTotalMmNext2Days,
}: WeatherStripProps) {
  // Show unavailable state if the backend said weather is not available or current is missing
  if (!available || !current) {
    return (
      <section
        aria-label="Current Weather"
        className="w-full h-full flex flex-col justify-center bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-[#DCD6C0]"
      >
        <div className="flex items-center gap-3 text-[#5F6E62]">
          <div className="w-10 h-10 rounded-xl bg-[#EFEAD8] flex items-center justify-center shrink-0">
            <AlertIcon className="w-5 h-5 text-[#5F6E62]" />
          </div>
          <p className="text-sm font-medium">Weather not available right now</p>
        </div>
      </section>
    );
  }

  // Rain label: "Yes" if currently raining or expected soon, with mm if above 0
  const isRaining = current.is_raining || rainExpectedSoon;
  const rainLabel = isRaining ? "Yes" : "No";
  const rainMmText =
    rainTotalMmNext2Days && rainTotalMmNext2Days > 0
      ? ` · ${rainTotalMmNext2Days.toFixed(1)} mm`
      : "";

  return (
    <section
      aria-label="Current Weather"
      className="w-full h-full flex flex-col justify-center bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-[#DCD6C0]"
    >
      {/* ── Phone & Tablet: 3-column horizontal strip ── */}
      <div className="lg:hidden grid grid-cols-3 divide-x divide-[#E3DEC3] text-center my-auto py-1">
        {/* Temperature */}
        <div className="flex flex-col items-center justify-center px-1 sm:px-2">
          <div className="flex items-center gap-1 sm:gap-1.5">
            <div className="w-6 h-6 flex items-center justify-center text-[#CA8A04]">
              <SunIcon className="w-5 h-5" />
            </div>
            <span className="text-xl sm:text-2xl font-bold text-[#1B2D21] whitespace-nowrap">
              {Math.round(current.temperature_c)}°C
            </span>
          </div>
          <span className="text-sm text-[#5F6E62] mt-1 whitespace-nowrap">Temperature</span>
        </div>

        {/* Rain */}
        <div className="flex flex-col items-center justify-center px-1 sm:px-2">
          <div className="flex items-center gap-1 sm:gap-1.5">
            <div className="w-6 h-6 flex items-center justify-center text-[#0369A1]">
              <CloudRainIcon className="w-5 h-5" />
            </div>
            <span className="text-xl sm:text-2xl font-bold text-[#1B2D21] whitespace-nowrap">
              {rainLabel}
            </span>
          </div>
          <span className="text-sm text-[#5F6E62] mt-1 whitespace-nowrap">
            Rain{rainMmText}
          </span>
        </div>

        {/* Humidity */}
        <div className="flex flex-col items-center justify-center px-1 sm:px-2">
          <div className="flex items-center gap-1 sm:gap-1.5">
            <div className="w-6 h-6 flex items-center justify-center text-[#0E7490]">
              <DropIcon className="w-5 h-5" />
            </div>
            <span className="text-xl sm:text-2xl font-bold text-[#1B2D21] whitespace-nowrap">
              {current.humidity_percent}%
            </span>
          </div>
          <span className="text-sm text-[#5F6E62] mt-1 whitespace-nowrap">Humidity</span>
        </div>
      </div>

      {/* ── Desktop only: hero temperature + stacked metric rows ── */}
      <div className="hidden lg:flex flex-col h-full justify-center gap-3">
        <p className="text-sm text-[#5F6E62]">Near your fields</p>

        {/* Hero: sun icon box + temperature */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#FEF9C3] flex items-center justify-center text-[#CA8A04] shrink-0">
            <SunIcon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-3xl lg:text-4xl font-bold text-[#1B2D21] leading-none">
              {Math.round(current.temperature_c)}°C
            </p>
            <p className="text-sm text-[#5F6E62] mt-0.5">Temperature</p>
          </div>
        </div>

        {/* Two stacked metric rows */}
        <div className="flex flex-col gap-2 pt-3 border-t border-[#F2EFE4]">
          {/* Rain row */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] flex items-center justify-center text-[#0369A1] shrink-0">
              <CloudRainIcon className="w-5 h-5" />
            </div>
            <div className="flex-1 flex justify-between items-baseline min-w-0">
              <span className="text-sm text-[#5F6E62]">Rain forecast</span>
              <span className="text-base font-semibold text-[#1B2D21]">
                {rainLabel}{rainMmText}
              </span>
            </div>
          </div>

          {/* Humidity row */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#ECFEFF] flex items-center justify-center text-[#0E7490] shrink-0">
              <DropIcon className="w-5 h-5" />
            </div>
            <div className="flex-1 flex justify-between items-baseline min-w-0">
              <span className="text-sm text-[#5F6E62]">Humidity</span>
              <span className="text-base font-semibold text-[#1B2D21]">
                {current.humidity_percent}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
