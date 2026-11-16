"use client";

// Plan Page: Today's Irrigation Schedule
// Displays scheduled watering tasks with live backend logging via POST /irrigation-log
// Connects to real fields and checks today's irrigation logs via GET /fields/{id}/irrigation-log

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getFields, getIrrigationLog, getTodaySchedule, logIrrigation } from "@/lib/api";
import { BackendField, ScheduleItem } from "@/lib/types";
import { ClockIcon } from "@/components/icons";
import ErrorNotice from "@/components/ErrorNotice";
import LoadingCard from "@/components/LoadingCard";
import ScheduleCard from "@/components/ScheduleCard";

/**
 * Format timestamp as "6:30 AM"
 */
function formatLogTime(isoDateStr?: string | null): string {
  if (!isoDateStr) {
    return new Date().toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
    });
  }
  try {
    const d = new Date(isoDateStr);
    if (isNaN(d.getTime())) return isoDateStr;
    return d.toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return isoDateStr;
  }
}

/**
 * Matching Rule:
 * 1. Match by fieldId if provided on the schedule item (f.id === item.fieldId).
 * 2. Otherwise match by name/nickname:
 *    - Direct match with f.nickname or f.name (case-insensitive).
 *    - "Field X" pattern match against field ID X.
 * 3. Returns undefined if the field is not registered.
 */
function findMatchedField(
  item: ScheduleItem,
  realFields: BackendField[]
): BackendField | undefined {
  // Rule 1: By explicit fieldId
  if (item.fieldId !== undefined && item.fieldId !== null) {
    const numId = Number(item.fieldId);
    const found = realFields.find((f) => f.id === numId);
    if (found) return found;
  }

  // Rule 2: By field nickname or name
  const itemTrimmed = item.fieldName.trim().toLowerCase();
  const byName = realFields.find(
    (f) =>
      (f.nickname && f.nickname.trim().toLowerCase() === itemTrimmed) ||
      (f.name && f.name.trim().toLowerCase() === itemTrimmed)
  );
  if (byName) return byName;

  // Rule 2b: "Field N" matching field ID N
  const fieldNumMatch = item.fieldName.match(/^field\s*(\d+)$/i);
  if (fieldNumMatch) {
    const parsedId = parseInt(fieldNumMatch[1], 10);
    return realFields.find((f) => f.id === parsedId);
  }

  return undefined;
}

export default function PlanPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);
  const [fields, setFields] = useState<BackendField[]>([]);

  // Track per-item saving states and errors
  const [savingMap, setSavingMap] = useState<Record<string, boolean>>({});
  const [errorMap, setErrorMap] = useState<Record<string, string | null>>({});

  // Fetch real fields, sample schedule, and today's irrigation logs
  const loadPlanData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. Load real fields from backend
      const realFields = await getFields();
      setFields(realFields);

      // 2. Load schedule items
      const rawSchedule = await getTodaySchedule();

      // 3. For each matched field, check today's irrigation logs (days = 1)
      // A schedule item is shown as Done if an irrigation log exists for its field today.
      // Note: When real ML recommendations exist, this will be matched specifically by recommendation_id.
      const updatedSchedule = await Promise.all(
        rawSchedule.map(async (item) => {
          const matched = findMatchedField(item, realFields);
          if (!matched) {
            return item;
          }

          try {
            const logRes = await getIrrigationLog(matched.id, 1);
            if (logRes && logRes.logs && logRes.logs.length > 0) {
              // Found a log entry recorded today for this field
              const latestLog = logRes.logs[logRes.logs.length - 1];
              return {
                ...item,
                done: true,
                doneAt: formatLogTime(latestLog.started_at),
              };
            }
          } catch {
            // If only the log call fails for a field, show items as not done and keep page working
          }

          return item;
        })
      );

      setScheduleItems(updatedSchedule);
    } catch (err: any) {
      setError(err?.message || "Could not load irrigation plan. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlanData();
  }, [loadPlanData]);

  // Handle clicking "Done" on a schedule card
  const handleDone = async (item: ScheduleItem) => {
    // Prevent double taps
    if (savingMap[item.id]) return;

    // Clear previous error for this item
    setErrorMap((prev) => ({ ...prev, [item.id]: null }));

    // Find matched real field
    const matched = findMatchedField(item, fields);
    if (!matched) {
      // Rule: show plain message with AlertIcon if field is not registered yet; do not crash
      setErrorMap((prev) => ({
        ...prev,
        [item.id]: "This field is not registered yet",
      }));
      return;
    }

    // Set saving state
    setSavingMap((prev) => ({ ...prev, [item.id]: true }));

    try {
      // Save irrigation to backend via POST /irrigation-log
      const saved = await logIrrigation(matched.id, item.durationMinutes);

      // Format completion time
      const timeStr = formatLogTime(saved.started_at);

      // Switch item to done state and remove button
      setScheduleItems((prev) =>
        prev.map((it) =>
          it.id === item.id ? { ...it, done: true, doneAt: timeStr } : it
        )
      );
    } catch (err: any) {
      // Show short plain error message and keep button available
      setErrorMap((prev) => ({
        ...prev,
        [item.id]: err?.message || "Could not save irrigation. Try again.",
      }));
    } finally {
      setSavingMap((prev) => ({ ...prev, [item.id]: false }));
    }
  };

  const doneCount = scheduleItems.filter((i) => i.done).length;

  return (
    <div className="flex flex-col gap-6 lg:gap-8 max-w-full overflow-x-hidden">
      {/* ── Page Header Card ── */}
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
              {!loading && !error && (
                <span className="text-xs font-bold text-[#235334] bg-[#EAF5EB] px-2.5 py-0.5 rounded-full border border-[#A3D9A5]">
                  {doneCount} of {scheduleItems.length} completed
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-[#5F6E62]">
              Today&apos;s watering timetable and records
            </p>
          </div>
        </div>

        {/* Home navigation shortcut */}
        <Link
          href="/"
          className="min-h-[56px] inline-flex items-center justify-center px-6 py-3 rounded-2xl bg-[#FAF7EE] hover:bg-[#F2EDDC] border border-[#DCD6C0] text-[#235334] font-bold text-sm sm:text-base active:scale-95 transition-all self-stretch sm:self-auto cursor-pointer"
        >
          ← Dashboard
        </Link>
      </div>

      {/* ── Main Schedule Content ── */}
      {loading ? (
        // Loading State: 3 skeleton cards
        <section
          aria-label="Loading schedule"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6"
        >
          <LoadingCard />
          <LoadingCard />
          <LoadingCard />
        </section>
      ) : error ? (
        // Error State: Retry card
        <section aria-label="Error loading schedule">
          <ErrorNotice message={error} onRetry={loadPlanData} />
        </section>
      ) : (
        // Normal State: Grid of schedule cards
        <section aria-label="Today's irrigation schedule list" className="flex flex-col gap-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
            {scheduleItems.map((item) => {
              const matched = findMatchedField(item, fields);
              return (
                <ScheduleCard
                  key={item.id}
                  item={item}
                  matchedField={matched}
                  isSaving={Boolean(savingMap[item.id])}
                  errorMessage={errorMap[item.id]}
                  onDone={handleDone}
                />
              );
            })}
          </div>

          {/* Advisory banner */}
          <div className="p-4 rounded-2xl bg-[#FAF7EE] border border-[#DCD6C0] text-xs sm:text-sm text-[#5F6E62] flex items-center gap-3">
            <span className="font-bold text-[#235334]">Note:</span>
            <p>
              Tapping &quot;Done&quot; records your irrigation to the farm log.
              Timetable updates automatically as conditions change.
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
