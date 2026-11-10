// Weather strip component
// Displays temperature, rain expected, and humidity with clear icons
// Content and style are identical on phone and desktop; only size and layout scale

import { STRINGS } from "../lib/strings";
import { Weather } from "../lib/types";

interface WeatherStripProps {
  weather: Weather;
}

export default function WeatherStrip({ weather }: WeatherStripProps) {
  const rainText = weather.rainExpected
    ? STRINGS.weather.rainYes
    : STRINGS.weather.rainNo;

  return (
    <section
      aria-label="Current Weather"
      className="w-full h-full flex flex-col justify-center bg-[#FFFFFF] rounded-3xl p-4 sm:p-5 lg:p-6 shadow-sm border border-[#DCD6C0]"
    >
      {/* 3 Metric Stats (Temperature, Rain, Humidity) */}
      <div className="grid grid-cols-3 divide-x divide-[#E3DEC3] text-center my-auto py-1">
        {/* Temperature */}
        <div className="flex flex-col items-center justify-center px-1 sm:px-2">
          <div className="flex items-center gap-1 sm:gap-1.5">
            <span className="text-xl sm:text-2xl lg:text-3xl shrink-0" aria-hidden="true">
              🌤️
            </span>
            <span className="text-sm sm:text-base lg:text-2xl font-black text-[#1B2D21] whitespace-nowrap">
              {weather.temperature}
              {STRINGS.weather.temperatureUnit}
            </span>
          </div>
          <span className="text-[11px] sm:text-xs lg:text-sm font-semibold text-[#5F6E62] mt-1 whitespace-nowrap">
            {STRINGS.weather.temperatureLabel}
          </span>
        </div>

        {/* Rain Forecast */}
        <div className="flex flex-col items-center justify-center px-1 sm:px-2">
          <div className="flex items-center gap-1 sm:gap-1.5">
            <span className="text-xl sm:text-2xl lg:text-3xl shrink-0" aria-hidden="true">
              🌧️
            </span>
            <span className="text-sm sm:text-base lg:text-2xl font-black text-[#1B2D21] whitespace-nowrap">
              {STRINGS.weather.rainLabel}: {rainText}
            </span>
          </div>
          <span className="text-[11px] sm:text-xs lg:text-sm font-semibold text-[#5F6E62] mt-1 whitespace-nowrap">
            {STRINGS.weather.forecastLabel}
          </span>
        </div>

        {/* Humidity */}
        <div className="flex flex-col items-center justify-center px-1 sm:px-2">
          <div className="flex items-center gap-1 sm:gap-1.5">
            <span className="text-xl sm:text-2xl lg:text-3xl shrink-0" aria-hidden="true">
              💧
            </span>
            <span className="text-sm sm:text-base lg:text-2xl font-black text-[#1B2D21] whitespace-nowrap">
              {weather.humidity}%
            </span>
          </div>
          <span className="text-[11px] sm:text-xs lg:text-sm font-semibold text-[#5F6E62] mt-1 whitespace-nowrap">
            {STRINGS.weather.humidityLabel}
          </span>
        </div>
      </div>
    </section>
  );
}
