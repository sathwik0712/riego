// Home Screen (Farmer Dashboard)
// Responsive across Phone (<640px), Tablet (640-1023px), and Desktop (>=1024px)
// Uses static data via lib/api.ts

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
    <div className="flex flex-col gap-6 lg:gap-8">
      {/* 
        1 & 2. Advice & Weather Row
        - Phone & Tablet: Stacked full-width cards
        - Desktop (>=1024px): Side-by-side in one row (Advice 7 cols, Weather 5 cols)
      */}
      <section
        aria-label="Daily Irrigation Recommendation & Weather"
        className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-stretch"
      >
        <div className="lg:col-span-7">
          <AdviceCard actionText={advice.actionText} />
        </div>
        <div className="lg:col-span-5">
          <WeatherStrip weather={weather} />
        </div>
      </section>

      {/* 
        3. Registered Field Cards Section
        - Phone: 1-column list
        - Tablet (640px-1023px): 2-column grid
        - Desktop (>=1024px): 3-column grid
      */}
      <section aria-label="Field Moisture Overview" className="flex flex-col gap-4">
        <div className="flex items-center justify-between px-0.5">
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#1B2D21]">
            {STRINGS.fieldsHeader}
          </h2>
          <span className="text-xs sm:text-sm font-bold text-[#5F6E62] bg-[#EFEAD8] px-3 py-1 rounded-full border border-[#D1CAAD]">
            {fields.length} Active Fields
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
          {fields.map((field) => (
            <FieldCard key={field.id} field={field} />
          ))}
        </div>
      </section>
    </div>
  );
}
