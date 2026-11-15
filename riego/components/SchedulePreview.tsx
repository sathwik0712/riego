// Today's schedule preview component for desktop Home page
// Displays upcoming irrigation events in time order
// Follows unified card style: 4-tier type scale, 48px icon box, rounded-3xl

import Link from "next/link";
import { ClockIcon, DropIcon, CheckIcon } from "./icons";
import { ScheduleItem } from "../lib/types";

interface SchedulePreviewProps {
  schedule: ScheduleItem[];
}

export default function SchedulePreview({ schedule }: SchedulePreviewProps) {
  // Sort in time order (ensures consistent chronology)
  const items = [...schedule].slice(0, 3);

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#DCD6C0] shadow-sm flex flex-col justify-between">
      {/* Header with Title and accessible link (>=56px tap target) */}
      <div className="flex items-center justify-between pb-2 border-b border-[#F2EFE4]">
        <div>
          <h3 className="text-xl font-semibold text-[#1B2D21] leading-tight">
            Today&apos;s schedule
          </h3>
          <p className="text-sm text-[#5F6E62] mt-0.5">Irrigation timetable</p>
        </div>
        <Link
          href="/plan"
          className="inline-flex items-center justify-center min-h-[56px] px-3 text-sm font-semibold text-[#235334] hover:text-[#183B25] hover:underline focus:outline-none focus:ring-2 focus:ring-[#2E7D32]/30 rounded-xl"
        >
          See full plan &rarr;
        </Link>
      </div>

      {/* 3 flat rows in time order with slightly reduced vertical padding */}
      <div className="flex flex-col divide-y divide-[#F2EFE4]">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between py-2.5 first:pt-2.5 last:pb-0"
          >
            {/* Left: 48px icon box, time, and field name */}
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-[#E8F5E9] text-[#2E7D32] border border-[#C8E6C9] flex items-center justify-center shrink-0">
                <ClockIcon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-base font-semibold text-[#1B2D21] leading-tight">
                  {item.time}
                </p>
                <p className="text-sm text-[#5F6E62] leading-tight mt-0.5">
                  {item.fieldName}
                </p>
              </div>
            </div>

            {/* Right: duration with drop icon and optional Done chip */}
            <div className="flex items-center gap-2">
              <div className="inline-flex items-center gap-1.5 text-sm font-medium text-[#1B2D21] bg-[#F4F1E8] px-2.5 py-1 rounded-xl border border-[#DCD6C0]">
                <DropIcon className="w-4 h-4 text-[#2E7D32]" />
                <span>{item.durationMinutes} min</span>
              </div>
              {item.done && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#2E7D32] bg-[#E8F5E9] px-2.5 py-1 rounded-full border border-[#C8E6C9]">
                  <CheckIcon className="w-3.5 h-3.5" />
                  Done
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
