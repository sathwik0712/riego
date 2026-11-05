// Home Screen (Farmer Dashboard)
// Mobile-first, single column layout scaling up to tablet and desktop
// Displays today's primary advice, weather strip, and field moisture cards

import { getAdvice, getFields, getWeather } from "../lib/api";
import { STRINGS } from "../lib/strings";
import AdviceCard from "../components/AdviceCard";
import WeatherStrip from "../components/WeatherStrip";
import FieldCard from "../components/FieldCard";

export default async function HomePage() {
  // Read sample data through API functions (ready for FastAPI later)
  const [advice, weather, fields] = await Promise.all([
    getAdvice(),
    getWeather(),
    getFields(),
  ]);

  return (
    <div className="flex flex-col gap-4">
      {/* 1. Today's Advice Card (Most prominent screen element) */}
      <AdviceCard actionText={advice.actionText} />

      {/* 2. Weather Strip */}
      <WeatherStrip weather={weather} />

      {/* 3. Registered Field Cards */}
      <section aria-label="Field Moisture Overview" className="flex flex-col gap-3 mt-1">
        <h2 className="text-xl font-extrabold text-[#1B2D21] px-0.5">
          {STRINGS.fieldsHeader}
        </h2>

        <div className="flex flex-col gap-3">
          {fields.map((field) => (
            <FieldCard key={field.id} field={field} />
          ))}
        </div>
      </section>
    </div>
  );
}
