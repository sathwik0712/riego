"use client";

// AdviceCard: Primary irrigation recommendation card
// Consistent styling: p-5 sm:p-6 padding, rounded-3xl, 4-tier typography scale
// Content centered vertically with no awkward middle gap; advice sentence in text-3xl
// overflow-hidden and isolation: isolate prevent any decorative bleeding past rounded corners

import { useState } from "react";
import { STRINGS } from "../lib/strings";
import { ClockIcon, DropIcon, SpeakerIcon } from "./icons";

interface AdviceCardProps {
  actionText: string;
  bestTime?: string;    // e.g. "6:00 - 6:30 AM"
  waterAmount?: string; // e.g. "1,200 L"
}

export default function AdviceCard({ actionText, bestTime, waterAmount }: AdviceCardProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  // Visual simulation for speaker feedback (actual Sarvam AI voice is in Weeks 5-6)
  const handleSpeakerClick = () => {
    setIsPlaying(true);
    setTimeout(() => setIsPlaying(false), 1200);
  };

  return (
    <section
      aria-label="Today's Irrigation Advice"
      className="relative w-full h-full flex flex-col justify-center bg-[#1A3E27] text-[#FAF7EE] rounded-3xl p-5 sm:p-6 shadow-sm border border-[#2D6A4F] overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #1A3E27 60%, #0F2D1A 100%)",
        isolation: "isolate",
      }}
    >
      {/* Decorative blurred background circle — contained with pointer-events-none */}
      <div
        className="absolute -top-6 -right-6 w-32 h-32 lg:w-40 lg:h-40 bg-[#2D6A4F]/40 rounded-full blur-xl pointer-events-none"
        aria-hidden="true"
      />

      {/* Desktop only: faint decorative water drop in corner */}
      <div
        className="hidden lg:block absolute bottom-4 right-6 opacity-10 text-[100px] leading-none select-none pointer-events-none"
        aria-hidden="true"
      >
        💧
      </div>

      {/* Centered flex column with normal gap-6 */}
      <div className="flex flex-col gap-4 sm:gap-6 justify-center relative z-10">
        {/* Upper block: header badge + sentence + speaker */}
        <div className="flex flex-col gap-2 sm:gap-3">
          {/* Uppercase pill as allowed for Today's Advice */}
          <div className="flex items-center gap-2">
            <DropIcon className="w-6 h-6 text-[#A3E635]" />
            <span className="text-sm font-bold uppercase tracking-wider text-[#A3E635] bg-[#0E2818] px-3 py-1 rounded-full border border-[#2D6A4F]">
              {STRINGS.adviceHeader}
            </span>
          </div>

          {/* Advice sentence in text-3xl on desktop + min-56px speaker button */}
          <div className="flex items-start justify-between gap-4">
            <p className="text-xl sm:text-2xl lg:text-3xl font-bold leading-snug text-white flex-1">
              {actionText}
            </p>

            <button
              type="button"
              onClick={handleSpeakerClick}
              aria-label={STRINGS.speakerAria}
              title={STRINGS.speakerAria}
              className={`min-w-[56px] min-h-[56px] w-14 h-14 rounded-2xl flex items-center justify-center transition-all shadow-sm shrink-0 border ${
                isPlaying
                  ? "bg-[#A3E635] text-[#0E2818] scale-105 border-white"
                  : "bg-[#2D6A4F] text-white hover:bg-[#3D8B65] active:scale-95 border-[#459C72]"
              }`}
            >
              <SpeakerIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Desktop only: glass info tiles directly below without a divider line */}
        {(bestTime || waterAmount) && (
          <div className="hidden lg:grid grid-cols-2 gap-3">
            {bestTime && (
              <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-2xl p-2.5 sm:p-3 border border-white/15">
                <div className="w-10 h-10 rounded-xl bg-[#A3E635]/20 flex items-center justify-center shrink-0">
                  <ClockIcon className="w-5 h-5 text-[#A3E635]" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-[#A3E635]/90">Best time</p>
                  <p className="text-base font-semibold text-white truncate">{bestTime}</p>
                </div>
              </div>
            )}
            {waterAmount && (
              <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-2xl p-2.5 sm:p-3 border border-white/15">
                <div className="w-10 h-10 rounded-xl bg-[#A3E635]/20 flex items-center justify-center shrink-0">
                  <DropIcon className="w-5 h-5 text-[#A3E635]" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-[#A3E635]/90">Water amount</p>
                  <p className="text-base font-semibold text-white truncate">{waterAmount}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
