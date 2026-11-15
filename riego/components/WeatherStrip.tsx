// WeatherStrip component
// Unified styling: rounded-3xl, p-5 sm:p-6, 4-tier type scale
// Phone & tablet keep horizontal 3-column strip; desktop displays hero temperature + stacked rows

import { STRINGS } from "../lib/strings";
import { Weather } from "../lib/types";
import { CloudRainIcon, DropIcon, SunIcon } from "./icons";

interface WeatherStripProps {
  weather: Weather;
}

export default function WeatherStrip({ weather }: WeatherStripProps) {
  const rainText = weather.rainExpected ? STRINGS.weather.rainYes : STRINGS.weather.rainNo;

  return (
    <section
      aria-label="Current Weather"
      className="w-full h-full flex flex-col justify-center bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-[#DCD6C0]"
    >
      {/* ── Phone & Tablet: original 3-column horizontal strip ── */}
      <div className="lg:hidden grid grid-cols-3 divide-x divide-[#E3DEC3] text-center my-auto py-1">
        {/* Temperature */}
        <div className="flex flex-col items-center justify-center px-1 sm:px-2">
          <div className="flex items-center gap-1 sm:gap-1.5">
            <span className="text-xl sm:text-2xl shrink-0" aria-hidden="true">🌤️</span>
            <span className="text-xl sm:text-2xl font-bold text-[#1B2D21] whitespace-nowrap">
              {weather.temperature}{STRINGS.weather.temperatureUnit}
            </span>
          </div>
          <span className="text-sm text-[#5F6E62] mt-1 whitespace-nowrap">
            {STRINGS.weather.temperatureLabel}
          </span>
        </div>

        {/* Rain Forecast */}
        <div className="flex flex-col items-center justify-center px-1 sm:px-2">
          <div className="flex items-center gap-1 sm:gap-1.5">
            <span className="text-xl sm:text-2xl shrink-0" aria-hidden="true">🌧️</span>
            <span className="text-xl sm:text-2xl font-bold text-[#1B2D21] whitespace-nowrap">
              {STRINGS.weather.rainLabel}: {rainText}
            </span>
          </div>
          <span className="text-sm text-[#5F6E62] mt-1 whitespace-nowrap">
            {STRINGS.weather.forecastLabel}
          </span>
        </div>

        {/* Humidity */}
        <div className="flex flex-col items-center justify-center px-1 sm:px-2">
          <div className="flex items-center gap-1 sm:gap-1.5">
            <span className="text-xl sm:text-2xl shrink-0" aria-hidden="true">💧</span>
            <span className="text-xl sm:text-2xl font-bold text-[#1B2D21] whitespace-nowrap">
              {weather.humidity}%
            </span>
          </div>
          <span className="text-sm text-[#5F6E62] mt-1 whitespace-nowrap">
            {STRINGS.weather.humidityLabel}
          </span>
        </div>
      </div>

      {/* ── Desktop only: hero temperature + stacked metric rows ── */}
      <div className="hidden lg:flex flex-col h-full justify-center gap-3">
        {/* Top label in sentence case */}
        <p className="text-sm text-[#5F6E62]">
          Near your fields
        </p>

        {/* Hero: sun icon box + text-4xl temperature */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#FEF9C3] flex items-center justify-center text-[#CA8A04] shrink-0">
            <SunIcon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-3xl lg:text-4xl font-bold text-[#1B2D21] leading-none">
              {weather.temperature}{STRINGS.weather.temperatureUnit}
            </p>
            <p className="text-sm text-[#5F6E62] mt-0.5">
              {STRINGS.weather.temperatureLabel}
            </p>
          </div>
        </div>

        {/* Two stacked metric rows separated by thin divider */}
        <div className="flex flex-col gap-2 pt-3 border-t border-[#F2EFE4]">
          {/* Rain row */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] flex items-center justify-center text-[#0369A1] shrink-0">
              <CloudRainIcon className="w-5 h-5" />
            </div>
            <div className="flex-1 flex justify-between items-baseline min-w-0">
              <span className="text-sm text-[#5F6E62]">
                {STRINGS.weather.forecastLabel}
              </span>
              <span className="text-base font-semibold text-[#1B2D21]">
                {STRINGS.weather.rainLabel}: {rainText}
              </span>
            </div>
          </div>

          {/* Humidity row */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#ECFEFF] flex items-center justify-center text-[#0E7490] shrink-0">
              <DropIcon className="w-5 h-5" />
            </div>
            <div className="flex-1 flex justify-between items-baseline min-w-0">
              <span className="text-sm text-[#5F6E62]">
                {STRINGS.weather.humidityLabel}
              </span>
              <span className="text-base font-semibold text-[#1B2D21]">
                {weather.humidity}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
