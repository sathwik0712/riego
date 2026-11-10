"use client";

// AdviceCard: Most prominent element on the screen
// Strong color, large clear text, water drop icon, speaker button (visual only)
// Content and style are identical on phone and desktop; only size scales responsively

import { useState } from "react";
import { STRINGS } from "../lib/strings";

interface AdviceCardProps {
  actionText: string;
}

export default function AdviceCard({ actionText }: AdviceCardProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  // Visual simulation for speaker feedback (actual Sarvam AI voice is in Weeks 5-6)
  const handleSpeakerClick = () => {
    setIsPlaying(true);
    setTimeout(() => setIsPlaying(false), 1200);
  };

  return (
    <section
      aria-label="Today's Irrigation Advice"
      className="w-full h-full flex flex-col justify-between bg-[#1A3E27] text-[#FAF7EE] rounded-3xl p-5 sm:p-6 lg:p-7 shadow-md border-2 border-[#2D6A4F] relative overflow-hidden"
    >
      {/* Decorative subtle background circle */}
      <div className="absolute -top-12 -right-12 w-36 h-36 lg:w-48 lg:h-48 bg-[#2D6A4F]/40 rounded-full blur-xl pointer-events-none" />

      <div>
        {/* Header with Water Drop Icon */}
        <div className="flex items-center gap-2 mb-2 lg:mb-3">
          <span className="text-2xl lg:text-3xl" aria-hidden="true">
            💧
          </span>
          <span className="text-xs lg:text-sm font-black uppercase tracking-wider text-[#A3E635] bg-[#0E2818] px-3 py-1 rounded-full border border-[#2D6A4F]">
            {STRINGS.adviceHeader}
          </span>
        </div>

        {/* Main plain advice sentence & speaker button */}
        <div className="flex items-start justify-between gap-3 sm:gap-4 mt-2">
          <p className="text-xl sm:text-2xl lg:text-3xl font-extrabold leading-snug text-white flex-1">
            {actionText}
          </p>

          {/* Big accessible speaker button (min 56px tap target) */}
          <button
            type="button"
            onClick={handleSpeakerClick}
            aria-label={STRINGS.speakerAria}
            title={STRINGS.speakerAria}
            className={`min-w-[56px] min-h-[56px] w-14 h-14 lg:w-16 lg:h-16 rounded-2xl flex items-center justify-center text-2xl lg:text-3xl transition-all shadow-md shrink-0 border ${
              isPlaying
                ? "bg-[#A3E635] text-[#0E2818] scale-105 border-white"
                : "bg-[#2D6A4F] text-white hover:bg-[#3D8B65] active:scale-95 border-[#459C72]"
            }`}
          >
            <span aria-hidden="true">{isPlaying ? "🔊" : "🔈"}</span>
          </button>
        </div>
      </div>
    </section>
  );
}
