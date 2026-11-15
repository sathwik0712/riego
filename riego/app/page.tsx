// Home Screen (Farmer Dashboard)
// Responsive across Phone (<640px), Tablet (640-1023px), and Desktop (>=1024px)
// Uses static data via lib/api.ts

import {
  getAdvice,
  getFields,
  getMoistureHistory,
  getRecentAlerts,
  getSummaryStats,
  getTodaySchedule,
  getWeather,
} from "../lib/api";
import { STRINGS } from "../lib/strings";
import AdviceCard from "../components/AdviceCard";
import WeatherStrip from "../components/WeatherStrip";
import FieldCard from "../components/FieldCard";
import SummaryTiles from "../components/SummaryTiles";
import MoistureChart from "../components/MoistureChart";
import SchedulePreview from "../components/SchedulePreview";
import RecentAlerts from "../components/RecentAlerts";

export default async function HomePage() {
  // Read all data in parallel (ready for FastAPI later)
  const [advice, weather, fields, stats, moistureData, alerts, schedule] =
    await Promise.all([
      getAdvice(),
      getWeather(),
      getFields(),
      getSummaryStats(),
      getMoistureHistory(),
      getRecentAlerts(),
      getTodaySchedule(),
    ]);

  return (
    <div className="flex flex-col gap-6">
      {/*
        0. Summary Tiles Row — desktop only (hidden on phone & tablet)
        4 compact tiles with 48px icon boxes, 4xl numbers, and single helper lines
      */}
      <SummaryTiles
        stats={stats}
        history={moistureData.history}
        alerts={alerts}
      />

      {/*
        1 & 2. Advice & Weather Row
        - Phone & Tablet: Stacked full-width cards with gap-4
        - Desktop (>=1024px): Side-by-side in one row (Advice 7 cols, Weather 5 cols)
      */}
      <section
        aria-label="Daily irrigation recommendation and weather"
        className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch"
      >
        <div className="lg:col-span-7">
          <AdviceCard
            actionText={advice.actionText}
            bestTime={advice.bestTime}
            waterAmount={advice.waterAmount}
          />
        </div>
        <div className="lg:col-span-5">
          <WeatherStrip weather={weather} />
        </div>
      </section>

      {/*
        3. Registered Field Cards Section
        - Phone: 1-column list with gap-4
        - Tablet (640px-1023px): 2-column grid with gap-4; odd last card spans 2 cols
        - Desktop (>=1024px): 3-column grid with gap-4
      */}
      <section aria-label="Field moisture overview" className="flex flex-col gap-4">
        <div className="flex items-center justify-between px-0.5">
          {/* Section heading in Title style (text-xl semibold) and normal sentence case */}
          <h2 className="text-xl font-semibold text-[#1B2D21]">
            {STRINGS.fieldsHeader}
          </h2>
          <span className="text-sm font-medium text-[#5F6E62] bg-[#EFEAD8] px-3 py-1 rounded-full border border-[#D1CAAD]">
            {fields.length} active fields
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:[&>*:last-child:nth-child(odd)]:col-span-2 lg:[&>*:last-child:nth-child(odd)]:col-span-1">
          {fields.map((field) => (
            <FieldCard key={field.id} field={field} />
          ))}
        </div>
      </section>

      {/*
        4. Bottom Analytics & Schedule Row — desktop only (hidden on phone & tablet)
        - Layout: lg:grid-cols-3 gap-4 items-stretch
        - Chart takes 2 columns, right column holds SchedulePreview and RecentAlerts stacked with gap-4
      */}
      <section
        aria-label="Moisture analytics and schedule"
        className="hidden lg:grid lg:grid-cols-3 gap-4 items-stretch"
      >
        <div className="lg:col-span-2 h-full flex flex-col">
          <MoistureChart
            history={moistureData.history}
            target={moistureData.target}
            fields={fields}
          />
        </div>
        <div className="lg:col-span-1 flex flex-col gap-4">
          <SchedulePreview schedule={schedule} />
          <RecentAlerts alerts={alerts} />
        </div>
      </section>
    </div>
  );
}
