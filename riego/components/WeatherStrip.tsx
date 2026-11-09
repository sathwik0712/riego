// Weather strip component
// Displays temperature, rain expected, and humidity with clear icons
// Responsive: scales from compact mobile strip to a balanced desktop telemetry card

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
      className="w-full h-full flex flex-col justify-between bg-[#FFFFFF] rounded-3xl p-4 sm:p-5 lg:p-6 shadow-sm border border-[#DCD6C0]"
    >
      {/* Desktop header label */}
      <div className="hidden lg:flex items-center justify-between pb-3 border-b border-[#E3DEC3]">
        <div className="flex items-center gap-2">
          <span className="text-xl">📍</span>
          <h3 className="text-sm font-extrabold uppercase tracking-wider text-[#3D4D41]">
            Farm Weather Telemetry
          </h3>
        </div>
        <span className="text-xs font-semibold text-[#5F6E62]">OpenWeather</span>
      </div>

      {/* 3 Metric Stats */}
      <div className="grid grid-cols-3 divide-x divide-[#E3DEC3] text-center my-auto py-1">
        {/* Temperature */}
        <div className="flex flex-col items-center justify-center px-1 sm:px-2">
          <div className="flex items-center gap-1.5">
            <span className="text-2xl lg:text-3xl" aria-hidden="true">
              🌤️
            </span>
            <span className="text-xl sm:text-2xl lg:text-3xl font-black text-[#1B2D21]">
              {weather.temperature}
              {STRINGS.weather.temperatureUnit}
            </span>
          </div>
          <span className="text-xs sm:text-sm font-semibold text-[#5F6E62] mt-1">
            {STRINGS.weather.temperatureLabel}
          </span>
        </div>

        {/* Rain Forecast */}
        <div className="flex flex-col items-center justify-center px-1 sm:px-2">
          <div className="flex items-center gap-1.5">
            <span className="text-2xl lg:text-3xl" aria-hidden="true">
              🌧️
            </span>
            <span className="text-base sm:text-xl lg:text-2xl font-black text-[#1B2D21]">
              {STRINGS.weather.rainLabel}: {rainText}
            </span>
          </div>
          <span className="text-xs sm:text-sm font-semibold text-[#5F6E62] mt-1">
            {STRINGS.weather.forecastLabel}
          </span>
        </div>

        {/* Humidity */}
        <div className="flex flex-col items-center justify-center px-1 sm:px-2">
          <div className="flex items-center gap-1.5">
            <span className="text-2xl lg:text-3xl" aria-hidden="true">
              💧
            </span>
            <span className="text-xl sm:text-2xl lg:text-3xl font-black text-[#1B2D21]">
              {weather.humidity}%
            </span>
          </div>
          <span className="text-xs sm:text-sm font-semibold text-[#5F6E62] mt-1">
            {STRINGS.weather.humidityLabel}
          </span>
        </div>
      </div>

      {/* Desktop footer hint */}
      <div className="hidden lg:flex items-center justify-between pt-3 border-t border-[#E3DEC3] text-xs text-[#5F6E62]">
        <span>No rain expected in next 24 hours</span>
        <span className="font-semibold text-[#235334]">Evaporation: Normal</span>
      </div>
    </section>
  );
}
