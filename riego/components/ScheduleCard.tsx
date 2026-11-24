"use client";

// ScheduleCard component for the Plan page
// Displays an upcoming irrigation event, its matched field details, and a real "Done" action button
// Follows design system: 4-tier type scale, rounded-3xl p-6 cards, line icons, >=56px touch target

import { BackendField, ScheduleItem } from "../lib/types";
import { AlertIcon, CheckIcon, ClockIcon, DropIcon } from "./icons";

interface ScheduleCardProps {
  item: ScheduleItem;
  matchedField?: BackendField;
  isSaving: boolean;
  errorMessage?: string | null;
  canMarkDone?: boolean;
  onDone: (item: ScheduleItem) => void;
}

export default function ScheduleCard({
  item,
  matchedField,
  isSaving,
  errorMessage,
  canMarkDone = true,
  onDone,
}: ScheduleCardProps) {
  // Field display title
  const displayName = matchedField
    ? matchedField.nickname?.trim() || matchedField.name?.trim() || `Field ${matchedField.id}`
    : item.fieldName;

  const crop = matchedField?.crop;

  return (
    <article
      aria-label={`Irrigation schedule for ${displayName}`}
      className={`rounded-3xl p-5 sm:p-6 border transition-all shadow-sm flex flex-col justify-between gap-5 ${
        item.done
          ? "bg-[#FAF7EE]/70 border-[#DCD6C0]"
          : "bg-white border-[#DCD6C0] hover:border-[#235334]/40"
      }`}
    >
      {/* Top Header: Time badge, duration chip, and optional crop */}
      <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#F2EFE4]">
        <div className="flex items-center gap-3">
          {/* 48px Clock icon box */}
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
              item.done
                ? "bg-[#EAF5EB] text-[#235334] border-[#A3D9A5]"
                : "bg-[#FAF7EE] text-[#235334] border-[#DCD6C0]"
            }`}
          >
            <ClockIcon className="w-6 h-6" />
          </div>

          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#1B2D21] leading-tight">
              {item.time}
            </h2>
            <p className="text-xs sm:text-sm font-medium text-[#5F6E62]">
              Scheduled start
            </p>
          </div>
        </div>

        {/* Duration badge with drop icon */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FAF7EE] border border-[#DCD6C0] text-sm font-bold text-[#1B2D21]">
          <DropIcon className="w-4 h-4 text-[#235334]" />
          <span>{item.durationMinutes} min</span>
        </div>
      </div>

      {/* Field & Crop Information */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="text-lg sm:text-xl font-bold text-[#1B2D21]">
            {displayName}
          </span>
          {crop && (
            <span className="text-xs font-bold text-[#235334] bg-[#EAF5EB] px-2.5 py-0.5 rounded-full border border-[#A3D9A5]">
              {crop}
            </span>
          )}
        </div>
        <p className="text-xs sm:text-sm text-[#5F6E62]">
          {matchedField
            ? `Plot #${matchedField.id} · ${matchedField.irrigation_method || "Irrigation"}`
            : item.fieldId
            ? `Plot #${item.fieldId}`
            : "Scheduled irrigation"}
        </p>
      </div>

      {/* Inline error notice if operation failed or field unregistered */}
      {errorMessage && (
        <div
          role="alert"
          className="flex items-center gap-2.5 text-xs sm:text-sm font-bold text-[#991B1B] bg-[#FEE2E2] border border-[#FCA5A5] p-3 rounded-2xl"
        >
          <AlertIcon className="w-4 h-4 text-[#DC2626] shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Bottom Action Area: Either "Done" indicator or interactive "Done" button */}
      <div className="pt-2">
        {item.done ? (
          // Completed state: Check icon + "Done" + saved time (multi-cue signal, no button)
          <div className="min-h-[56px] w-full rounded-2xl bg-[#EAF5EB] border border-[#A3D9A5] text-[#1E5128] px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-full bg-[#235334] text-[#FAF7EE] flex items-center justify-center shrink-0">
                <CheckIcon className="w-4 h-4" />
              </span>
              <span className="font-extrabold text-base text-[#1E5128]">
                Done
              </span>
            </div>
            {item.doneAt && (
              <span className="text-xs sm:text-sm font-semibold text-[#2E7D32]">
                {item.doneAt}
              </span>
            )}
          </div>
        ) : canMarkDone ? (
          // Action button: at least 56px tall, disabled while saving, prevents double taps
          <button
            type="button"
            disabled={isSaving}
            onClick={() => {
              if (!isSaving) {
                onDone(item);
              }
            }}
            className="w-full min-h-[56px] rounded-2xl bg-[#235334] hover:bg-[#1A3E27] active:scale-95 text-[#FAF7EE] font-bold text-base shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            {isSaving ? (
              <span>Saving...</span>
            ) : (
              <>
                <CheckIcon className="w-5 h-5 text-[#FAF7EE]" />
                <span>Done</span>
              </>
            )}
          </button>
        ) : (
          // Upcoming session (tomorrow / later day / later today for same field): no Done button
          <div className="min-h-[56px] w-full rounded-2xl bg-[#FAF7EE] border border-[#DCD6C0] text-[#5F6E62] px-4 py-3 flex items-center justify-center gap-2">
            <ClockIcon className="w-4 h-4 text-[#5F6E62] shrink-0" />
            <span className="font-semibold text-sm sm:text-base">
              Scheduled
            </span>
          </div>
        )}
      </div>
    </article>
  );
}
