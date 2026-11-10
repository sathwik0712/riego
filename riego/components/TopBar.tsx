"use client";

// Top bar: farmer profile on far left, Riego logo + title in center, help & language on right
// Responsive: compact on mobile (<640px) fitting cleanly down to 360px without overlap,
// full language names and "Help" label on desktop (>=1024px)

import { useState } from "react";
import { STRINGS } from "../lib/strings";

interface TopBarProps {
  farmerInitial?: string;
}

export default function TopBar({ farmerInitial = "R" }: TopBarProps) {
  // Visual language switcher state (default English)
  const [activeLang, setActiveLang] = useState("en");

  return (
    <header className="sticky top-0 z-30 w-full bg-[#FAF7EE]/95 backdrop-blur-sm border-b border-[#E3DEC3] px-3 sm:px-6 lg:px-8 py-2 sm:py-2.5">
      <div className="flex items-center justify-between gap-1.5 sm:gap-3 w-full max-w-6xl mx-auto">
        {/* Left: Farmer Profile Circle (hidden on desktop where it lives in the sidebar) */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            aria-label={STRINGS.profileAria}
            className="w-11 h-11 sm:w-12 sm:h-12 min-w-[44px] min-h-[44px] sm:min-w-[48px] sm:min-h-[48px] rounded-full bg-[#235334] text-[#FAF7EE] font-bold text-lg sm:text-xl flex items-center justify-center shadow-sm active:scale-95 transition-transform lg:hidden shrink-0"
          >
            {farmerInitial}
          </button>

          {/* Desktop welcome message */}
          <div className="hidden lg:block">
            <h2 className="text-xl font-extrabold text-[#1B2D21]">
              Overview Dashboard
            </h2>
            <p className="text-xs text-[#5F6E62]">
              Real-time irrigation guidance & soil telemetry
            </p>
          </div>
        </div>

        {/* Center: Riego Logo + Brand Title (visible on mobile/tablet, hidden on desktop sidebar) */}
        <div className="flex items-center justify-center gap-1.5 sm:gap-2 flex-1 min-w-0 lg:hidden">
          {/* Small square card with water drop (matching sidebar logo) */}
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#235334] text-[#FAF7EE] flex items-center justify-center text-sm sm:text-base shadow-sm shrink-0">
            💧
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight sm:tracking-wide text-[#1B2D21] truncate">
            {STRINGS.appName}
          </h1>
        </div>

        {/* Right: Help button and Language Switcher */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Help Button (shows text label on desktop) */}
          <button
            type="button"
            aria-label={STRINGS.helpButtonAria}
            className="h-11 sm:h-14 min-h-[44px] sm:min-h-[56px] px-2.5 sm:px-4 rounded-xl border border-[#D1CAAD] bg-[#FAF7EE] text-[#1B2D21] font-bold text-base sm:text-lg flex items-center justify-center gap-1.5 shadow-sm hover:bg-[#EFEAD8] active:scale-95 transition"
            title={STRINGS.helpButtonAria}
          >
            <span className="text-lg sm:text-xl">?</span>
            <span className="hidden sm:inline text-sm font-bold">
              {STRINGS.helpLabel}
            </span>
          </button>

          {/* Language Switcher */}
          <div
            className="flex items-center h-11 sm:h-14 min-h-[44px] sm:min-h-[56px] bg-[#EFEAD8] rounded-xl p-0.5 sm:p-1 border border-[#D1CAAD]"
            role="group"
            aria-label="Language selection"
          >
            {STRINGS.languages.map((lang) => {
              const isActive = activeLang === lang.code;
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => setActiveLang(lang.code)}
                  className={`h-9 sm:h-12 min-h-[36px] sm:min-h-[48px] px-2 sm:px-2.5 lg:px-3.5 rounded-lg text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
                    isActive
                      ? "bg-[#235334] text-[#FAF7EE] shadow-sm"
                      : "text-[#1B2D21] hover:bg-[#E3DEC3]/60"
                  }`}
                >
                  {/* Compact code on phone & tablet */}
                  <span className="lg:hidden">{lang.label}</span>
                  {/* Full language name on desktop */}
                  <span className="hidden lg:inline">{lang.fullLabel}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </header>
  );
}
