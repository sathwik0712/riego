"use client";

// Top bar:
// Mobile: profile circle on left, Riego logo & title in center, help & language on right
// Desktop: greeting & date on left, help & language on right (full language names)

import { useState } from "react";
import Logo from "./Logo";
import { STRINGS } from "../lib/strings";

// Format date e.g. "Sunday, 15 November 2026"
function formatDate(d: Date): string {
  return d.toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function getGreeting(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

interface TopBarProps {
  farmerInitial?: string;
  farmerName?: string;
}

export default function TopBar({
  farmerInitial = "R",
  farmerName = "Ramesh",
}: TopBarProps) {
  const [activeLang, setActiveLang] = useState("en");

  const now = new Date();
  const greetingText = `${getGreeting(now.getHours())}, ${farmerName}`;
  const dateText = formatDate(now);

  return (
    <header className="sticky top-0 z-30 w-full bg-[#FAF7EE]/95 backdrop-blur-sm border-b border-[#E3DEC3] px-3 sm:px-6 lg:px-8 py-2 sm:py-2.5">
      <div className="flex items-center justify-between gap-2 w-full max-w-6xl mx-auto">
        {/* Mobile: Farmer Profile Circle (<1024px) */}
        <div className="flex items-center lg:hidden shrink-0">
          <button
            type="button"
            aria-label={STRINGS.profileAria}
            className="w-11 h-11 sm:w-12 sm:h-12 min-w-[44px] min-h-[44px] sm:min-w-[48px] sm:min-h-[48px] rounded-full bg-[#235334] text-[#FAF7EE] font-bold text-lg sm:text-xl flex items-center justify-center shadow-sm active:scale-95 transition-transform shrink-0"
          >
            {farmerInitial}
          </button>
        </div>

        {/* Desktop: Greeting & Date on the left (>=1024px) */}
        <div className="hidden lg:flex flex-col justify-center">
          <h1 className="text-xl font-semibold text-[#1B2D21] leading-tight">
            {greetingText}
          </h1>
          <p className="text-sm text-[#5F6E62]">
            {dateText}
          </p>
        </div>

        {/* Mobile/Tablet Center: Riego Logo + Brand Title (<1024px) */}
        <div className="flex items-center justify-center flex-1 min-w-0 lg:hidden">
          <Logo size="sm" tone="dark" showName={true} />
        </div>

        {/* Right: Help button and Language Switcher */}
        <div className="flex items-center gap-2 shrink-0 ml-auto">
          {/* Help Button (shows text label on desktop) */}
          <button
            type="button"
            aria-label={STRINGS.helpButtonAria}
            className="h-11 sm:h-14 min-h-[44px] sm:min-h-[56px] px-2.5 sm:px-4 rounded-xl border border-[#D1CAAD] bg-[#FAF7EE] text-[#1B2D21] font-bold text-base sm:text-lg flex items-center justify-center gap-1.5 shadow-sm hover:bg-[#EFEAD8] active:scale-95 transition"
            title={STRINGS.helpButtonAria}
          >
            <span className="text-lg sm:text-xl">?</span>
            <span className="hidden sm:inline text-sm font-semibold">
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
                  className={`h-9 sm:h-12 min-h-[36px] sm:min-h-[48px] px-2.5 sm:px-3 lg:px-3.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                    isActive
                      ? "bg-[#235334] text-[#FAF7EE] shadow-sm"
                      : "text-[#1B2D21] hover:bg-[#E3DEC3]/60"
                  }`}
                >
                  <span className="lg:hidden">{lang.label}</span>
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
