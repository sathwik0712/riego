"use client";

// Plan Page: Real Irrigation Timetable & Records
// Loads real time-slotted irrigation plans from GET /plan/today (farmer from token).
// Groups active slots (duration > 0) by Today and Tomorrow in IST.
// Done state is per-session, keyed by field_id + slot start time, stored in localStorage.
// Saves last good plan in browser storage for offline resilience (NFR-3).

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getFields, getTodayPlan, logIrrigation } from "@/lib/api";
import { BackendField, ScheduleItem } from "@/lib/types";
import { ClockIcon, DropIcon } from "@/components/icons";
import ErrorNotice from "@/components/ErrorNotice";
import LoadingCard from "@/components/LoadingCard";
import ScheduleCard from "@/components/ScheduleCard";
import { formatTimeIST, getSlotDayGroup, formatLastUpdatedIST } from "@/lib/dateUtils";
import {
  savePlanCache,
  loadPlanCache,
  loadDashboardCache,
  markSessionDone,
  getSessionDoneAt,
  pruneSessionDoneCache,
} from "@/lib/cache";

/**
 * Matching Rule:
 * 1. Match by explicit numeric fieldId.
 * 2. Otherwise by nickname / name or "Field N".
 */
function findMatchedField(
  item: ScheduleItem,
  realFields: BackendField[]
): BackendField | undefined {
  if (item.fieldId !== undefined && item.fieldId !== null) {
    const numId = Number(item.fieldId);
    const found = realFields.find((f) => f.id === numId);
    if (found) return found;
  }

  const itemTrimmed = item.fieldName.trim().toLowerCase();
  const byName = realFields.find(
    (f) =>
      (f.nickname && f.nickname.trim().toLowerCase() === itemTrimmed) ||
      (f.name && f.name.trim().toLowerCase() === itemTrimmed)
  );
  if (byName) return byName;

  const fieldNumMatch = item.fieldName.match(/^field\s*(\d+)$/i);
  if (fieldNumMatch) {
    const parsedId = parseInt(fieldNumMatch[1], 10);
    return realFields.find((f) => f.id === parsedId);
  }

  return undefined;
}

/** Stable item id that encodes the slot key (fieldId + start) for done-state lookup. */
function slotItemId(fieldId: number, start: string, idx: number) {
  return `plan-slot-${fieldId}-${start}-${idx}`;
}

/** Extract fieldId and slotStart from an item id. */
function parseSlotKey(itemId: string): { fieldId: number; slotStart: string } | null {
  // Format: plan-slot-{fieldId}-{start}-{idx}
  // start is an ISO string that may contain hyphens so we can't just split on "-"
  // Instead we stored slotStart separately in item — read from the item directly.
  return null; // Not used; we store slotStart on the ScheduleItem via a custom field.
}

// Extend ScheduleItem with the raw slotStart for cache key lookup.
interface SlottedItem extends ScheduleItem {
  slotStart: string; // raw ISO from the backend slot
}

export default function PlanPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usingCache, setUsingCache] = useState(false);
  const [lastUpdatedTime, setLastUpdatedTime] = useState<string | null>(null);

  const [todayItems, setTodayItems] = useState<SlottedItem[]>([]);
  const [tomorrowItems, setTomorrowItems] = useState<SlottedItem[]>([]);
  const [fields, setFields] = useState<BackendField[]>([]);

  const [savingMap, setSavingMap] = useState<Record<string, boolean>>({});
  const [errorMap, setErrorMap] = useState<Record<string, string | null>>({});

  const loadPlanData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setUsingCache(false);
    setLastUpdatedTime(null);

    if (typeof window !== "undefined") pruneSessionDoneCache();

    try {
      const [realFields, rawSlots] = await Promise.all([
        getFields(),
        getTodayPlan(),
      ]);
      setFields(realFields);
      savePlanCache(rawSlots);

      const activeSlots = (rawSlots || []).filter((s) => s.duration_minutes > 0);
      activeSlots.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

      const todayGroup: SlottedItem[] = [];
      const tomorrowGroup: SlottedItem[] = [];

      activeSlots.forEach((slot, idx) => {
        const matched = realFields.find((f) => f.id === slot.field_id);
        const fieldName =
          slot.field_nickname?.trim() ||
          matched?.nickname?.trim() ||
          matched?.name?.trim() ||
          `Field ${slot.field_id}`;

        // Session done state keyed by fieldId + slotStart
        const doneAt = getSessionDoneAt(slot.field_id, slot.start);

        const item: SlottedItem = {
          id: slotItemId(slot.field_id, slot.start, idx),
          fieldId: slot.field_id,
          fieldName,
          slotStart: slot.start,
          time: formatTimeIST(slot.start),
          durationMinutes: slot.duration_minutes,
          done: Boolean(doneAt),
          doneAt: doneAt ?? undefined,
        };

        const dayGroup = getSlotDayGroup(slot.start);
        if (dayGroup === "tomorrow") tomorrowGroup.push(item);
        else todayGroup.push(item);
      });

      setTodayItems(todayGroup);
      setTomorrowItems(tomorrowGroup);
    } catch (err: any) {
      // Offline: load from cache
      const cachedPlan = loadPlanCache();
      const cachedDashboard = loadDashboardCache();

      if (cachedPlan) {
        setUsingCache(true);
        setLastUpdatedTime(formatLastUpdatedIST(cachedPlan.savedAt));
        const realFields = cachedDashboard?.fields || [];
        setFields(realFields);

        const activeSlots = (cachedPlan.slots || []).filter(
          (s) => s.duration_minutes > 0
        );
        activeSlots.sort(
          (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
        );

        const todayGroup: SlottedItem[] = [];
        const tomorrowGroup: SlottedItem[] = [];

        activeSlots.forEach((slot, idx) => {
          const matched = realFields.find((f) => f.id === slot.field_id);
          const fieldName =
            slot.field_nickname?.trim() ||
            matched?.nickname?.trim() ||
            matched?.name?.trim() ||
            `Field ${slot.field_id}`;

          const doneAt = getSessionDoneAt(slot.field_id, slot.start);

          const item: SlottedItem = {
            id: slotItemId(slot.field_id, slot.start, idx),
            fieldId: slot.field_id,
            fieldName,
            slotStart: slot.start,
            time: formatTimeIST(slot.start),
            durationMinutes: slot.duration_minutes,
            done: Boolean(doneAt),
            doneAt: doneAt ?? undefined,
          };

          const dayGroup = getSlotDayGroup(slot.start);
          if (dayGroup === "tomorrow") tomorrowGroup.push(item);
          else todayGroup.push(item);
        });

        setTodayItems(todayGroup);
        setTomorrowItems(tomorrowGroup);
      } else {
        setError(
          err?.message ||
          "Could not load irrigation plan. Please check your connection and try again."
        );
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlanData();
  }, [loadPlanData]);

  const handleDone = async (item: SlottedItem) => {
    if (savingMap[item.id]) return;
    setErrorMap((prev) => ({ ...prev, [item.id]: null }));

    const matched = findMatchedField(item, fields);
    if (!matched) {
      setErrorMap((prev) => ({
        ...prev,
        [item.id]: "This field is not registered yet",
      }));
      return;
    }

    setSavingMap((prev) => ({ ...prev, [item.id]: true }));

    try {
      const saved = await logIrrigation(matched.id, item.durationMinutes);
      const timeStr = formatTimeIST(saved.started_at);

      // Persist this specific session as done (keyed by fieldId + slotStart)
      markSessionDone(matched.id, item.slotStart, timeStr);

      // Update only this exact item — not all items for the same field
      const updateList = (list: SlottedItem[]) =>
        list.map((it) =>
          it.id === item.id ? { ...it, done: true, doneAt: timeStr } : it
        );
      setTodayItems(updateList);
      setTomorrowItems(updateList);
    } catch (err: any) {
      setErrorMap((prev) => ({
        ...prev,
        [item.id]: err?.message || "Could not save irrigation. Try again.",
      }));
    } finally {
      setSavingMap((prev) => ({ ...prev, [item.id]: false }));
    }
  };

  const totalCount = todayItems.length + tomorrowItems.length;
  const doneCount =
    todayItems.filter((i) => i.done).length +
    tomorrowItems.filter((i) => i.done).length;

  return (
    <div className="flex flex-col gap-6 lg:gap-8 max-w-full overflow-x-hidden">
      {/* Page Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-[#DCD6C0] shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#FAF7EE] border border-[#DCD6C0] flex items-center justify-center text-[#235334] shrink-0">
            <ClockIcon className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-extrabold text-[#1B2D21]">
                Irrigation plan
              </h1>
              {!loading && !error && totalCount > 0 && (
                <span className="text-xs font-bold text-[#235334] bg-[#EAF5EB] px-2.5 py-0.5 rounded-full border border-[#A3D9A5]">
                  {doneCount} of {totalCount} completed
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-[#5F6E62]">
              Recommended watering timetable based on soil moisture and weather
            </p>
          </div>
        </div>

        <Link
          href="/"
          className="min-h-[56px] inline-flex items-center justify-center px-6 py-3 rounded-2xl bg-[#FAF7EE] hover:bg-[#F2EDDC] border border-[#DCD6C0] text-[#235334] font-bold text-sm sm:text-base active:scale-95 transition-all self-stretch sm:self-auto cursor-pointer"
        >
          ← Dashboard
        </Link>
      </div>

      {/* Offline notice */}
      {usingCache && (
        <div className="flex items-center gap-3 bg-[#FEF3C7] border border-[#FCD34D] rounded-2xl px-4 py-3 text-sm text-[#92400E]">
          <ClockIcon className="w-5 h-5 shrink-0" />
          <span className="flex-1">
            Showing last saved plan{" "}
            {lastUpdatedTime ? `· Last updated ${lastUpdatedTime}` : ""}
          </span>
          <button
            type="button"
            onClick={loadPlanData}
            className="min-h-[40px] px-4 py-2 rounded-xl bg-[#235334] text-[#FAF7EE] font-semibold text-sm hover:bg-[#1A3E27] active:scale-95 transition-all cursor-pointer"
          >
            Try again
          </button>
        </div>
      )}

      {/* Main Content */}
      {loading ? (
        <section
          aria-label="Loading schedule"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6"
        >
          <LoadingCard />
          <LoadingCard />
          <LoadingCard />
        </section>
      ) : error ? (
        <section aria-label="Error loading schedule">
          <ErrorNotice message={error} onRetry={loadPlanData} />
        </section>
      ) : totalCount === 0 ? (
        <section
          aria-label="No watering scheduled"
          className="bg-white p-8 sm:p-12 rounded-3xl border border-[#DCD6C0] text-center flex flex-col items-center justify-center gap-3 shadow-sm"
        >
          <div className="w-16 h-16 rounded-3xl bg-[#FAF7EE] border border-[#DCD6C0] flex items-center justify-center text-[#235334] mb-2">
            <DropIcon className="w-8 h-8 text-[#235334]" />
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#1B2D21]">
            No watering scheduled
          </h2>
          <p className="text-sm sm:text-base text-[#5F6E62] max-w-md">
            All fields currently have adequate soil moisture, or rain is forecast.
            The timetable will update automatically when fields need water.
          </p>
        </section>
      ) : (
        <div className="flex flex-col gap-8">
          {todayItems.length > 0 && (
            <section aria-label="Today's irrigation schedule" className="flex flex-col gap-4">
              <div className="flex items-center justify-between px-0.5">
                <h2 className="text-xl font-bold text-[#1B2D21]">Today</h2>
                <span className="text-xs font-semibold text-[#5F6E62] bg-[#EFEAD8] px-3 py-1 rounded-full border border-[#D1CAAD]">
                  {todayItems.length}{" "}
                  {todayItems.length === 1 ? "session" : "sessions"}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
                {todayItems.map((item) => (
                  <ScheduleCard
                    key={item.id}
                    item={item}
                    matchedField={findMatchedField(item, fields)}
                    isSaving={Boolean(savingMap[item.id])}
                    errorMessage={errorMap[item.id]}
                    onDone={(si) => handleDone(si as SlottedItem)}
                  />
                ))}
              </div>
            </section>
          )}

          {tomorrowItems.length > 0 && (
            <section aria-label="Tomorrow's irrigation schedule" className="flex flex-col gap-4">
              <div className="flex items-center justify-between px-0.5">
                <h2 className="text-xl font-bold text-[#1B2D21]">Tomorrow</h2>
                <span className="text-xs font-semibold text-[#5F6E62] bg-[#EFEAD8] px-3 py-1 rounded-full border border-[#D1CAAD]">
                  {tomorrowItems.length}{" "}
                  {tomorrowItems.length === 1 ? "session" : "sessions"}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
                {tomorrowItems.map((item) => (
                  <ScheduleCard
                    key={item.id}
                    item={item}
                    matchedField={findMatchedField(item, fields)}
                    isSaving={Boolean(savingMap[item.id])}
                    errorMessage={errorMap[item.id]}
                    onDone={(si) => handleDone(si as SlottedItem)}
                  />
                ))}
              </div>
            </section>
          )}

          <div className="p-4 rounded-2xl bg-[#FAF7EE] border border-[#DCD6C0] text-xs sm:text-sm text-[#5F6E62] flex items-center gap-3">
            <span className="font-bold text-[#235334]">Note:</span>
            <p>
              Tapping &quot;Done&quot; records your irrigation to the farm log.
              Timetable updates automatically as conditions change.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
