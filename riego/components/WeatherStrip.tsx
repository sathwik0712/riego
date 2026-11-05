// Weather strip component
// Displays temperature, rain expected, and humidity with clear icons

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
      className="w-full bg-[#FFFFFF] rounded-2xl p-3.5 shadow-sm border border-[#DCD6C0]"
    >
      <div className="grid grid-cols-3 divide-x divide-[#E3DEC3] text-center">
        {/* Temperature */}
        <div className="flex flex-col items-center justify-center px-1">
          <div className="flex items-center gap-1">
            <span className="text-xl" aria-hidden="true">
              🌤️
            </span>
            <span className="text-lg sm:text-xl font-black text-[#1B2D21]">
              {weather.temperature}
              {STRINGS.weather.temperatureUnit}
            </span>
          </div>
          <span className="text-[11px] font-medium text-[#5F6E62] mt-0.5">
            Temperature
          </span>
        </div>

        {/* Rain Forecast */}
        <div className="flex flex-col items-center justify-center px-1">
          <div className="flex items-center gap-1">
            <span className="text-xl" aria-hidden="true">
              🌧️
            </span>
            <span className="text-base sm:text-lg font-black text-[#1B2D21]">
              {STRINGS.weather.rainLabel}: {rainText}
            </span>
          </div>
          <span className="text-[11px] font-medium text-[#5F6E62] mt-0.5">
            Forecast
          </span>
        </div>

        {/* Humidity */}
        <div className="flex flex-col items-center justify-center px-1">
          <div className="flex items-center gap-1">
            <span className="text-xl" aria-hidden="true">
              💧
            </span>
            <span className="text-lg sm:text-xl font-black text-[#1B2D21]">
              {weather.humidity}%
            </span>
          </div>
          <span className="text-[11px] font-medium text-[#5F6E62] mt-0.5">
            {STRINGS.weather.humidityLabel}
          </span>
        </div>
      </div>
    </section>
  );
}

