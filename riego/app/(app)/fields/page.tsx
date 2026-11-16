"use client";

// Fields Page
// Displays all registered fields from the FastAPI backend and provides an "Add Field" action
// Handles loading states (LoadingCard), error recovery (ErrorNotice), and empty state

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { getFields, getFieldConditions, getSensorHistory } from "@/lib/api";
import { BackendField, FieldConditions } from "@/lib/types";
import { calculateDailyAverages } from "@/lib/fieldStatus";
import { STRINGS } from "@/lib/strings";
import FieldCard from "@/components/FieldCard";
import LoadingCard from "@/components/LoadingCard";
import ErrorNotice from "@/components/ErrorNotice";

interface FieldItem {
  field: BackendField;
  conditions?: FieldConditions | null;
  conditionsError?: boolean;
  trendData?: number[];
}

export default function FieldsPage() {
  const [items, setItems] = useState<FieldItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadFieldsData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch real fields from backend
      const fields = await getFields();

      // 2. Fetch conditions and 7-day sensor history for each field in parallel
      const [conditionsResults, historyResults] = await Promise.all([
        Promise.allSettled(fields.map((f) => getFieldConditions(f.id))),
        Promise.allSettled(fields.map((f) => getSensorHistory(f.id, 168))),
      ]);

      const fieldItems: FieldItem[] = fields.map((field, idx) => {
        const cRes = conditionsResults[idx];
        const hRes = historyResults[idx];

        let trendData: number[] | undefined = undefined;
        if (hRes.status === "fulfilled") {
          const daily = calculateDailyAverages(hRes.value.readings);
          if (daily.length >= 2) {
            trendData = daily.map((d) => d.moisture);
          }
        }

        if (cRes.status === "fulfilled") {
          return {
            field,
            conditions: cRes.value,
            conditionsError: false,
            trendData,
          };
        } else {
          return {
            field,
            conditions: null,
            conditionsError: true,
            trendData,
          };
        }
      });

      setItems(fieldItems);
    } catch (err: any) {
      setError(err?.message || "Could not reach the server. Check your internet and try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFieldsData();
  }, [loadFieldsData]);

  return (
    <div className="flex flex-col gap-6 lg:gap-8 max-w-full overflow-x-hidden">
      {/* Header with Title and prominent "Add Field" button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-[#DCD6C0] shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#FAF7EE] border border-[#DCD6C0] flex items-center justify-center text-sm font-bold text-[#235334]">
            RF
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-extrabold text-[#1B2D21]">
                {STRINGS.fieldsHeader}
              </h1>
              {!loading && !error && (
                <span className="text-xs font-bold text-[#235334] bg-[#EAF5EB] px-2.5 py-0.5 rounded-full border border-[#A3D9A5]">
                  {items.length} Registered
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-[#5F6E62]">
              Manage your agricultural plots and soil moisture sensors
            </p>
          </div>
        </div>

        {/* Big accessible Add Field button (at least 56px tall) */}
        <Link
          href="/fields/new"
          className="min-h-[56px] inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-[#235334] text-[#FAF7EE] font-bold text-base shadow-sm hover:bg-[#1A3E27] active:scale-95 transition-all self-stretch sm:self-auto cursor-pointer"
        >
          <span className="text-xl" aria-hidden="true">+</span>
          <span>Add Field</span>
        </Link>
      </div>

      {/* Main Content Area */}
      {loading ? (
        // Loading State: 3 skeleton cards
        <section aria-label="Loading fields" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
          <LoadingCard />
          <LoadingCard />
          <LoadingCard />
        </section>
      ) : error ? (
        // Error State: Farmer-friendly ErrorNotice with working "Try again"
        <section aria-label="Error loading fields" className="w-full">
          <ErrorNotice message={error} onRetry={loadFieldsData} />
        </section>
      ) : items.length === 0 ? (
        // Empty State: Plain card with icon, message, and Add Field button
        <section
          aria-label="No fields registered"
          className="w-full bg-white rounded-3xl p-8 sm:p-12 border border-[#DCD6C0] shadow-sm flex flex-col items-center text-center gap-4"
        >
          <div className="w-16 h-16 rounded-3xl bg-[#FAF7EE] border border-[#DCD6C0] flex items-center justify-center text-2xl font-bold text-[#235334]">
            +
          </div>
          <div className="max-w-md">
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#1B2D21]">
              No fields yet
            </h2>
            <p className="text-sm text-[#5F6E62] mt-1.5">
              Add your first agricultural plot to begin tracking soil moisture and receiving automated irrigation advice.
            </p>
          </div>
          <Link
            href="/fields/new"
            className="min-h-[56px] mt-2 inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl bg-[#235334] text-[#FAF7EE] font-bold text-base shadow-sm hover:bg-[#1A3E27] active:scale-95 transition-all cursor-pointer"
          >
            <span className="text-xl" aria-hidden="true">+</span>
            <span>Add Field</span>
          </Link>
        </section>
      ) : (
        // Normal State: Grid of registered field cards + register another card
        <section aria-label="Registered fields list" className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
            {items.map(({ field, conditions, conditionsError, trendData }) => (
              <FieldCard
                key={field.id}
                field={field}
                conditions={conditions}
                conditionsError={conditionsError}
                trendData={trendData}
                showEnterReading={true}
              />
            ))}

            {/* New field registration shortcut card */}
            <Link
              href="/fields/new"
              className="min-h-[160px] rounded-3xl border-2 border-dashed border-[#D1CAAD] bg-[#FAF7EE] hover:bg-[#F2EDDC] hover:border-[#235334] transition-all p-6 flex flex-col items-center justify-center text-center gap-2 group cursor-pointer"
            >
              <div className="w-12 h-12 rounded-2xl bg-white border border-[#DCD6C0] flex items-center justify-center text-xl font-bold text-[#235334] group-hover:scale-110 transition-transform">
                +
              </div>
              <span className="font-extrabold text-[#235334] text-base">
                + Register Another Field
              </span>
              <span className="text-xs text-[#5F6E62]">
                Connect crop, soil, and sensor
              </span>
            </Link>
          </div>
        </section>
      )}

      {/* Sensor advisory note */}
      <div className="p-4 rounded-2xl bg-[#EFEAD8] border border-[#D1CAAD] text-xs sm:text-sm text-[#5F6E62] flex items-center gap-3">
        <span className="font-bold text-[#235334]">Note:</span>
        <p>
          Telemetry updates automatically as fresh soil sensor readings and weather forecasts are fetched.
        </p>
      </div>
    </div>
  );
}
