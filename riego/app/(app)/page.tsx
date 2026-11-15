"use client";

// Home Screen (Farmer Dashboard)
// Loads real fields, conditions, weather, and sensor history from the FastAPI backend.
// Caches successful loads in localStorage so the farmer sees something even offline.
// Advice card, schedule preview, and recent alerts use sample data until ML/alert engines are built.

import { useEffect, useState, useCallback } from "react";
import {
  getAdvice,
  getFields,
  getFieldConditions,
  getSensorHistory,
  getRecentAlerts,
  getTodaySchedule,
} from "@/lib/api";
import { STRINGS } from "@/lib/strings";
import { BackendField, FieldConditions, MoistureDataPoint, Advice, Alert, ScheduleItem } from "@/lib/types";
import { calculateDailyAverages } from "@/lib/fieldStatus";
import { saveDashboardCache, loadDashboardCache } from "@/lib/cache";

import AdviceCard from "@/components/AdviceCard";
import WeatherStrip from "@/components/WeatherStrip";
import FieldCard from "@/components/FieldCard";
import SummaryTiles from "@/components/SummaryTiles";
import MoistureChart from "@/components/MoistureChart";
import SchedulePreview from "@/components/SchedulePreview";
import RecentAlerts from "@/components/RecentAlerts";
import LoadingCard from "@/components/LoadingCard";
import ErrorNotice from "@/components/ErrorNotice";
import { ClockIcon } from "@/components/icons";

export default function HomePage() {
  // ── State ──
  const [fields, setFields] = useState<BackendField[]>([]);
  const [conditionsByFieldId, setConditionsByFieldId] = useState<Record<number, FieldConditions>>({});
  const [conditionsErrors, setConditionsErrors] = useState<Record<number, boolean>>({});
  // Per-field trend data: daily averages for sparklines and the chart
  const [trendsByFieldId, setTrendsByFieldId] = useState<Record<number, MoistureDataPoint[]>>({});

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usingCache, setUsingCache] = useState(false);

  // Sample data for sections not yet connected to real backends
  const [advice, setAdvice] = useState<Advice>({ id: "", actionText: "", fieldId: "" });
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);

  // ── Data loading ──
  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    setUsingCache(false);

    try {
      // 1. Fetch fields from the backend
      const fieldsData = await getFields();

      // 2. Fetch conditions for each field in parallel (one failure does not break the others)
      const conditionsResults = await Promise.allSettled(
        fieldsData.map((f) => getFieldConditions(f.id))
      );
      const condMap: Record<number, FieldConditions> = {};
      const errMap: Record<number, boolean> = {};
      fieldsData.forEach((f, i) => {
        const r = conditionsResults[i];
        if (r.status === "fulfilled") {
          condMap[f.id] = r.value;
        } else {
          errMap[f.id] = true;
        }
      });

      // 3. Fetch 7-day sensor history for each field in parallel
      const historyResults = await Promise.allSettled(
        fieldsData.map((f) => getSensorHistory(f.id, 168))
      );
      const trendMap: Record<number, MoistureDataPoint[]> = {};
      fieldsData.forEach((f, i) => {
        const r = historyResults[i];
        if (r.status === "fulfilled") {
          trendMap[f.id] = calculateDailyAverages(r.value.readings);
        } else {
          trendMap[f.id] = [];
        }
      });

      // 4. Load sample data for sections not yet connected
      const [adviceData, alertsData, scheduleData] = await Promise.all([
        getAdvice(),
        getRecentAlerts(),
        getTodaySchedule(),
      ]);

      setFields(fieldsData);
      setConditionsByFieldId(condMap);
      setConditionsErrors(errMap);
      setTrendsByFieldId(trendMap);
      setAdvice(adviceData);
      setAlerts(alertsData);
      setSchedule(scheduleData);

      // 5. Save to localStorage for offline access
      saveDashboardCache({
        savedAt: new Date().toISOString(),
        fields: fieldsData,
        conditionsByFieldId: condMap,
      });
    } catch (err: any) {
      // Backend unreachable — try to load from cache
      const cached = loadDashboardCache();
      if (cached) {
        setFields(cached.fields);
        setConditionsByFieldId(cached.conditionsByFieldId);
        setConditionsErrors({});
        setTrendsByFieldId({}); // No trend data in cache
        setUsingCache(true);
        // Still load sample data for non-backend sections
        const [adviceData, alertsData, scheduleData] = await Promise.all([
          getAdvice(),
          getRecentAlerts(),
          getTodaySchedule(),
        ]);
        setAdvice(adviceData);
        setAlerts(alertsData);
        setSchedule(scheduleData);
      } else {
        setError(err?.message || "Could not reach the server. Check your internet and try again.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // ── Weather from the first field's conditions ──
  const firstFieldConditions = fields.length > 0 ? conditionsByFieldId[fields[0].id] : null;
  const weatherAvailable = firstFieldConditions?.weather?.available ?? false;
  const weatherCurrent = firstFieldConditions?.weather?.current ?? null;
  const rainExpectedSoon = firstFieldConditions?.weather?.rain_expected_soon ?? null;
  const rainTotalMm = firstFieldConditions?.weather?.rain_total_mm_next_2_days ?? null;

  // ── Compute a single sparkline trend for the summary tile (average all fields per day) ──
  const allDailyArrays = Object.values(trendsByFieldId).filter((arr) => arr.length >= 2);
  let summaryMoistureTrend: number[] | undefined;
  if (allDailyArrays.length > 0) {
    // Use the longest trend's day count; average across fields per day index
    const maxDays = Math.max(...allDailyArrays.map((a) => a.length));
    summaryMoistureTrend = [];
    for (let d = 0; d < maxDays; d++) {
      const values = allDailyArrays
        .map((a) => a[d]?.moisture)
        .filter((v): v is number => v !== undefined);
      summaryMoistureTrend.push(
        values.length > 0 ? Math.round(values.reduce((s, v) => s + v, 0) / values.length) : 0
      );
    }
  }

  // ── Build MoistureChart trend data ──
  const fieldTrends = fields
    .map((f) => {
      const trend = trendsByFieldId[f.id] ?? [];
      return {
        fieldId: f.id,
        name: f.nickname?.trim() || `Field ${f.id}`,
        crop: f.crop,
        dailyAverages: trend,
      };
    });

  // ── Loading state ──
  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="hidden lg:grid lg:grid-cols-4 gap-4">
          <LoadingCard /><LoadingCard /><LoadingCard /><LoadingCard />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-7"><LoadingCard /></div>
          <div className="lg:col-span-5"><LoadingCard /></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <LoadingCard /><LoadingCard /><LoadingCard />
        </div>
      </div>
    );
  }

  // ── Error state (no cache available) ──
  if (error) {
    return (
      <div className="flex flex-col gap-6">
        <ErrorNotice message={error} onRetry={loadDashboard} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Offline / cache notice */}
      {usingCache && (
        <div className="flex items-center gap-3 bg-[#FEF3C7] border border-[#FCD34D] rounded-2xl px-4 py-3 text-sm text-[#92400E]">
          <ClockIcon className="w-5 h-5 shrink-0" />
          <span className="flex-1">Showing last saved data</span>
          <button
            type="button"
            onClick={loadDashboard}
            className="min-h-[40px] px-4 py-2 rounded-xl bg-[#235334] text-[#FAF7EE] font-semibold text-sm hover:bg-[#1A3E27] active:scale-95 transition-all cursor-pointer"
          >
            Try again
          </button>
        </div>
      )}

      {/*
        0. Summary Tiles Row — desktop only (hidden on phone & tablet)
        4 compact tiles computed from real data
      */}
      <SummaryTiles
        fields={fields}
        conditionsByFieldId={conditionsByFieldId}
        moistureTrend={summaryMoistureTrend}
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
          {/* Sample advice — connects to ML engine in a later step */}
          <AdviceCard
            actionText={advice.actionText}
            bestTime={advice.bestTime}
            waterAmount={advice.waterAmount}
          />
        </div>
        <div className="lg:col-span-5">
          <WeatherStrip
            available={weatherAvailable}
            current={weatherCurrent}
            rainExpectedSoon={rainExpectedSoon}
            rainTotalMmNext2Days={rainTotalMm}
          />
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
          <h2 className="text-xl font-semibold text-[#1B2D21]">
            {STRINGS.fieldsHeader}
          </h2>
          <span className="text-sm font-medium text-[#5F6E62] bg-[#EFEAD8] px-3 py-1 rounded-full border border-[#D1CAAD]">
            {fields.length} active fields
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:[&>*:last-child:nth-child(odd)]:col-span-2 lg:[&>*:last-child:nth-child(odd)]:col-span-1">
          {fields.map((field) => (
            <FieldCard
              key={field.id}
              field={field}
              conditions={conditionsByFieldId[field.id]}
              conditionsError={conditionsErrors[field.id]}
              trendData={
                (trendsByFieldId[field.id]?.length ?? 0) >= 2
                  ? trendsByFieldId[field.id].map((d) => d.moisture)
                  : undefined
              }
            />
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
            fieldTrends={fieldTrends}
            target={{ min: 40, max: 70 }}
          />
        </div>
        <div className="lg:col-span-1 flex flex-col gap-4">
          {/* Sample schedule — connects to irrigation planner in a later step */}
          <SchedulePreview schedule={schedule} />
          {/* Sample alerts — connects to alert engine in a later step */}
          <RecentAlerts alerts={alerts} />
        </div>
      </section>
    </div>
  );
}
