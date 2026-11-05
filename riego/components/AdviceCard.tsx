"use client";

// AdviceCard: Most prominent element on the screen
// Strong color, large clear text, water drop icon, speaker button (visual only)

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
      className="w-full bg-[#1A3E27] text-[#FAF7EE] rounded-3xl p-5 shadow-md border-2 border-[#2D6A4F] relative overflow-hidden"
    >
      {/* Decorative subtle background circle */}
      <div className="absolute -top-12 -right-12 w-36 h-36 bg-[#2D6A4F]/40 rounded-full blur-xl pointer-events-none" />

      {/* Header with Water Drop Icon */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl" aria-hidden="true">
          💧
        </span>
        <span className="text-xs font-black uppercase tracking-wider text-[#A3E635] bg-[#0E2818] px-2.5 py-1 rounded-full border border-[#2D6A4F]">
          {STRINGS.adviceHeader}
        </span>
      </div>

      {/* Main plain advice sentence & speaker button */}
      <div className="flex items-start justify-between gap-3 mt-2">
        <p className="text-xl sm:text-2xl font-extrabold leading-snug text-white flex-1">
          {actionText}
        </p>

        {/* Big accessible speaker button (min 56px tap target) */}
        <button
          type="button"
          onClick={handleSpeakerClick}
          aria-label={STRINGS.speakerAria}
          title={STRINGS.speakerAria}
          className={`min-w-[56px] min-h-[56px] w-14 h-14 rounded-2xl flex items-center justify-center text-2xl transition-all shadow-md shrink-0 border ${
            isPlaying
              ? "bg-[#A3E635] text-[#0E2818] scale-105 border-white"
              : "bg-[#2D6A4F] text-white hover:bg-[#3D8B65] active:scale-95 border-[#459C72]"
          }`}
        >
          <span aria-hidden="true">{isPlaying ? "🔊" : "🔈"}</span>
        </button>
      </div>
    </section>
  );
}

