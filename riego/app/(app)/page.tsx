"use client";

// Home Screen (Farmer Dashboard)
// Loads real fields, conditions, weather, and sensor history from the FastAPI backend.
// Caches successful loads in localStorage so the farmer sees something even offline.
// Advice card shows a per-field slider using real plan + field recommendation data.

import { useEffect, useState, useCallback } from "react";
import {
  getFields,
  getFieldConditions,
  getFieldRecommendation,
  getSensorHistory,
  getRecentAlerts,
  getTodayPlan,
} from "@/lib/api";
import { STRINGS } from "@/lib/strings";
import {
  BackendField,
  FieldConditions,
  MoistureDataPoint,
  Alert,
  ScheduleItem,
  PlanSlot,
  AdviceItem,
} from "@/lib/types";
import { calculateDailyAverages } from "@/lib/fieldStatus";
import {
  saveDashboardCache,
  loadDashboardCache,
  savePlanCache,
  loadPlanCache,
} from "@/lib/cache";
import { formatTimeIST, formatLastUpdatedIST } from "@/lib/dateUtils";

import AdviceCard from "@/components/AdviceCard";
import WeatherStrip from "@/components/WeatherStrip";
import FieldCard from "@/components/FieldCard";
import SummaryTiles from "@/components/SummaryTiles";
import MoistureChart from "@/components/MoistureChart";
import SchedulePreview from "@/components/SchedulePreview";
import RecentAlerts from "@/components/RecentAlerts";
import LoadingCard from "@/components/LoadingCard";
import ErrorNotice from "@/components/ErrorNotice";
import ManualReadingModal from "@/components/ManualReadingModal";
import { ClockIcon } from "@/components/icons";

// Field type for the manual reading modal
type ReadingField = {
  id: number;
  name?: string | null;
  nickname?: string | null;
  crop: string;
};

// ── Build per-field advice items from plan slots + per-field recommendation data ──
// Order: a (water/not done) first, then c (needs_reading), then b (ok), then d (done).
// Within each group, sort by earliest slot time.
function buildAdviceItems(
  fields: BackendField[],
  activeSlots: PlanSlot[],
  recMap: Record<number, { status: string; advice_text?: string }>
): AdviceItem[] {
  const groups: {
    water: AdviceItem[];
    needs_reading: AdviceItem[];
    ok: AdviceItem[];
    done: AdviceItem[];
  } = { water: [], needs_reading: [], ok: [], done: [] };

  for (const field of fields) {
    const fieldName =
      field.nickname?.trim() || field.name?.trim() || `Field ${field.id}`;

    // Slots for this field, sorted chronologically
    const fieldSlots = activeSlots
      .filter((s) => s.field_id === field.id)
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

    if (fieldSlots.length > 0) {
      // Find the first not-done slot using slot.done
      const pendingSlots = fieldSlots.filter((s) => !s.done);

      if (pendingSlots.length > 0) {
        const earliest = pendingSlots[0];
        const timeStr = formatTimeIST(earliest.start);
        groups.water.push({
          fieldId: field.id,
          fieldName,
          kind: "water",
          sentence: `Water ${fieldName} at ${timeStr} for ${earliest.duration_minutes} minutes`,
          slotStart: earliest.start,
          moreCount: pendingSlots.length > 1 ? pendingSlots.length - 1 : 0,
        });
      } else {
        // All sessions for this field are done
        groups.done.push({
          fieldId: field.id,
          fieldName,
          kind: "done",
          sentence: "Done for today",
          slotStart: fieldSlots[0].start,
        });
      }
    } else {
      // No active slots → check recommendation
      const rec = recMap[field.id];
      if (
        rec &&
        (rec.status === "stale_reading" || rec.status === "not_enough_data")
      ) {
        groups.needs_reading.push({
          fieldId: field.id,
          fieldName,
          kind: "needs_reading",
          sentence: `We need a fresh soil reading for ${fieldName}`,
          readingField: {
            id: field.id,
            name: field.name,
            nickname: field.nickname,
            crop: field.crop,
          },
        });
      } else {
        const reason =
          rec?.advice_text ||
          "No watering needed today, soil moisture is adequate";
        groups.ok.push({
          fieldId: field.id,
          fieldName,
          kind: "ok",
          sentence: reason,
        });
      }
    }
  }

  // Sort each group by slotStart within water/done
  const bySlot = (a: AdviceItem, b: AdviceItem) => {
    if (!a.slotStart && !b.slotStart) return 0;
    if (!a.slotStart) return 1;
    if (!b.slotStart) return -1;
    return new Date(a.slotStart).getTime() - new Date(b.slotStart).getTime();
  };
  groups.water.sort(bySlot);
  groups.done.sort(bySlot);

  return [
    ...groups.water,
    ...groups.needs_reading,
    ...groups.ok,
    ...groups.done,
  ];
}

export default function HomePage() {
  // ── State ──
  const [fields, setFields] = useState<BackendField[]>([]);
  const [conditionsByFieldId, setConditionsByFieldId] = useState<Record<number, FieldConditions>>({});
  const [conditionsErrors, setConditionsErrors] = useState<Record<number, boolean>>({});
  const [trendsByFieldId, setTrendsByFieldId] = useState<Record<number, MoistureDataPoint[]>>({});

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usingCache, setUsingCache] = useState(false);
  const [cacheLabel, setCacheLabel] = useState<string | undefined>(undefined);

  // Per-field advice slider data
  const [adviceItems, setAdviceItems] = useState<AdviceItem[]>([]);

  // Desktop schedule preview
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);

  const [alerts, setAlerts] = useState<Alert[]>([]);

  // Manual reading modal
  const [selectedFieldForReading, setSelectedFieldForReading] = useState<ReadingField | null>(null);

  // ── Data loading ──
  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    setUsingCache(false);
    setCacheLabel(undefined);

    try {
      // 1. Fields
      const fieldsData = await getFields();

      // 2. Conditions
      const conditionsResults = await Promise.allSettled(
        fieldsData.map((f) => getFieldConditions(f.id))
      );
      const condMap: Record<number, FieldConditions> = {};
      const errMap: Record<number, boolean> = {};
      fieldsData.forEach((f, i) => {
        const r = conditionsResults[i];
        if (r.status === "fulfilled") condMap[f.id] = r.value;
        else errMap[f.id] = true;
      });

      // 3. Sensor history
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

      // 4. Today's plan
      let planSlots: PlanSlot[] = [];
      let planFromCache = false;
      try {
        planSlots = await getTodayPlan();
        savePlanCache(planSlots);
      } catch {
        const cachedPlan = loadPlanCache();
        planSlots = cachedPlan?.slots || [];
        planFromCache = true;
      }

      const activeSlots = planSlots.filter((s) => s.duration_minutes > 0);
      activeSlots.sort(
        (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
      );

      // 5. Per-field recommendations (only for fields with no active slots)
      const fieldsWithoutSlots = fieldsData.filter(
        (f) => !activeSlots.some((s) => s.field_id === f.id)
      );
      const recResults = await Promise.allSettled(
        fieldsWithoutSlots.map((f) => getFieldRecommendation(f.id))
      );
      const recMap: Record<number, { status: string; advice_text?: string }> = {};
      fieldsWithoutSlots.forEach((f, i) => {
        const r = recResults[i];
        if (r.status === "fulfilled") {
          recMap[f.id] = {
            status: r.value.status,
            advice_text: r.value.advice_text,
          };
        }
      });

      // 6. Build per-field advice items using slot.done
      const items = buildAdviceItems(
        fieldsData,
        activeSlots,
        recMap
      );
      setAdviceItems(items);

      // 7. Desktop schedule preview — first 3 active slots, done state from slot.done
      const previewItems: ScheduleItem[] = activeSlots.slice(0, 3).map((slot, idx) => ({
        id: `plan-slot-${slot.field_id}-${slot.start}-${idx}`,
        fieldId: slot.field_id,
        fieldName: slot.field_nickname?.trim() || `Field ${slot.field_id}`,
        time: formatTimeIST(slot.start),
        durationMinutes: slot.duration_minutes,
        done: Boolean(slot.done),
        doneAt: slot.done_at ? formatTimeIST(slot.done_at) : undefined,
      }));

      // 8. Alerts
      const alertsData = await getRecentAlerts();

      setFields(fieldsData);
      setConditionsByFieldId(condMap);
      setConditionsErrors(errMap);
      setTrendsByFieldId(trendMap);
      setSchedule(previewItems);
      setAlerts(alertsData);

      if (planFromCache) setUsingCache(true);

      saveDashboardCache({
        savedAt: new Date().toISOString(),
        fields: fieldsData,
        conditionsByFieldId: condMap,
      });
    } catch (err: any) {
      // Fully offline — try cache
      const cached = loadDashboardCache();
      const cachedPlan = loadPlanCache();

      if (cached) {
        setFields(cached.fields);
        setConditionsByFieldId(cached.conditionsByFieldId);
        setConditionsErrors({});
        setTrendsByFieldId({});
        setUsingCache(true);

        if (cachedPlan) {
          setCacheLabel(formatLastUpdatedIST(cachedPlan.savedAt));
          const activeSlots = (cachedPlan.slots || []).filter(
            (s) => s.duration_minutes > 0
          );
          activeSlots.sort(
            (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
          );

          const items = buildAdviceItems(
            cached.fields,
            activeSlots,
            {}
          );
          setAdviceItems(items);

          const previewItems: ScheduleItem[] = activeSlots
            .slice(0, 3)
            .map((slot, idx) => ({
              id: `plan-slot-${slot.field_id}-${slot.start}-${idx}`,
              fieldId: slot.field_id,
              fieldName: slot.field_nickname?.trim() || `Field ${slot.field_id}`,
              time: formatTimeIST(slot.start),
              durationMinutes: slot.duration_minutes,
              done: Boolean(slot.done),
              doneAt: slot.done_at ? formatTimeIST(slot.done_at) : undefined,
            }));
          setSchedule(previewItems);
        }

        setAlerts(await getRecentAlerts());
      } else {
        setError(
          err?.message || "Could not reach the server. Check your internet and try again."
        );
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // ── Weather from the first field's conditions ──
  const firstFieldConditions =
    fields.length > 0 ? conditionsByFieldId[fields[0].id] : null;
  const weatherAvailable = firstFieldConditions?.weather?.available ?? false;
  const weatherCurrent = firstFieldConditions?.weather?.current ?? null;
  const rainExpectedSoon =
    firstFieldConditions?.weather?.rain_expected_soon ?? null;
  const rainTotalMm =
    firstFieldConditions?.weather?.rain_total_mm_next_2_days ?? null;

  // ── Summary sparkline (average across fields) ──
  const allDailyArrays = Object.values(trendsByFieldId).filter(
    (arr) => arr.length >= 2
  );
  let summaryMoistureTrend: number[] | undefined;
  if (allDailyArrays.length > 0) {
    const maxDays = Math.max(...allDailyArrays.map((a) => a.length));
    summaryMoistureTrend = [];
    for (let d = 0; d < maxDays; d++) {
      const values = allDailyArrays
        .map((a) => a[d]?.moisture)
        .filter((v): v is number => v !== undefined);
      summaryMoistureTrend.push(
        values.length > 0
          ? Math.round(values.reduce((s, v) => s + v, 0) / values.length)
          : 0
      );
    }
  }

  // ── MoistureChart data ──
  const fieldTrends = fields.map((f) => ({
    fieldId: f.id,
    name: f.nickname?.trim() || `Field ${f.id}`,
    crop: f.crop,
    dailyAverages: trendsByFieldId[f.id] ?? [],
  }));

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

  // ── Error state (no cache) ──
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

      {/* Summary Tiles — desktop only */}
      <SummaryTiles
        fields={fields}
        conditionsByFieldId={conditionsByFieldId}
        moistureTrend={summaryMoistureTrend}
      />

      {/* Advice + Weather Row */}
      <section
        aria-label="Daily irrigation recommendation and weather"
        className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch"
      >
        <div className="lg:col-span-7">
          <AdviceCard
            items={adviceItems}
            usingCache={usingCache}
            lastUpdatedLabel={cacheLabel}
            onOpenManualReading={(f) => setSelectedFieldForReading(f)}
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

      {/* Field Cards */}
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

      {/* Analytics + Schedule — desktop only */}
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
          <SchedulePreview schedule={schedule} />
          <RecentAlerts alerts={alerts} />
        </div>
      </section>

      {/* Manual reading modal */}
      {selectedFieldForReading && (
        <ManualReadingModal
          field={selectedFieldForReading}
          onClose={() => setSelectedFieldForReading(null)}
          onSaved={() => {
            setSelectedFieldForReading(null);
            loadDashboard();
          }}
        />
      )}
    </div>
  );
}
