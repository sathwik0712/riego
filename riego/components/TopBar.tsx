"use client";

// Top bar: farmer profile, brand title, help button, and language switcher
// Mobile-first with large tap targets (>= 56px)

import { useState } from "react";
import { STRINGS } from "../lib/strings";

interface TopBarProps {
  farmerInitial?: string;
}

export default function TopBar({ farmerInitial = "R" }: TopBarProps) {
  // Visual language switcher state (default English)
  const [activeLang, setActiveLang] = useState("en");

  return (
    <header className="sticky top-0 z-30 w-full bg-[#FAF7EE]/95 backdrop-blur-sm border-b border-[#E3DEC3] px-4 py-2">
      <div className="flex items-center justify-between gap-2 max-w-lg mx-auto">
        {/* Left: Farmer Profile Circle */}
        <button
          type="button"
          aria-label={STRINGS.profileAria}
          className="w-14 h-14 min-w-[56px] min-h-[56px] rounded-full bg-[#235334] text-[#FAF7EE] font-bold text-xl flex items-center justify-center shadow-sm active:scale-95 transition-transform"
        >
          {farmerInitial}
        </button>

        {/* Center: Brand Title */}
        <div className="flex-1 text-center">
          <h1 className="text-2xl font-extrabold tracking-wide text-[#1B2D21]">
            {STRINGS.appName}
          </h1>
        </div>

        {/* Right: Help button and Language Switcher */}
        <div className="flex items-center gap-1.5">
          {/* Help Button */}
          <button
            type="button"
            aria-label={STRINGS.helpButtonAria}
            className="w-14 h-14 min-w-[56px] min-h-[56px] rounded-xl border border-[#D1CAAD] bg-[#FAF7EE] text-[#1B2D21] font-bold text-xl flex items-center justify-center shadow-sm hover:bg-[#EFEAD8] active:scale-95 transition"
            title={STRINGS.helpButtonAria}
          >
            ?
          </button>

          {/* Language Switcher */}
          <div
            className="flex items-center h-14 min-h-[56px] bg-[#EFEAD8] rounded-xl p-1 border border-[#D1CAAD]"
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
                  className={`h-12 min-h-[48px] px-2.5 rounded-lg text-sm font-bold transition-all ${
                    isActive
                      ? "bg-[#235334] text-[#FAF7EE] shadow-sm"
                      : "text-[#1B2D21] hover:bg-[#E3DEC3]/60"
                  }`}
                >
                  {lang.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </header>
  );
}

