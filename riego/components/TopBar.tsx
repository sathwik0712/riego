"use client";

// Top bar:
// Mobile/Tablet: Logo on left, help & language and profile circle on right. Tapping circle opens menu with name, phone, logout.
// Desktop: greeting & date on left, help & language on right.

import { useState } from "react";
import { useRouter } from "next/navigation";
import Logo from "./Logo";
import { LogoutIcon } from "./icons";
import { endSession } from "@/lib/session";
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
  farmerPhone?: string;
}

export default function TopBar({
  farmerInitial = "R",
  farmerName = "Ramesh",
  farmerPhone = "9876543210",
}: TopBarProps) {
  const router = useRouter();
  const [activeLang, setActiveLang] = useState("en");
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const now = new Date();
  const greetingText = `${getGreeting(now.getHours())}, ${farmerName}`;
  const dateText = formatDate(now);

  const formattedPhone =
    farmerPhone && farmerPhone.length === 10
      ? `+91 ${farmerPhone.slice(0, 5)} ${farmerPhone.slice(5)}`
      : farmerPhone ? `+91 ${farmerPhone}` : "";

  return (
    <header className="sticky top-0 z-30 w-full bg-[#FAF7EE]/95 backdrop-blur-sm border-b border-[#E3DEC3] px-3 sm:px-6 lg:px-8 py-2 sm:py-2.5">
      <div className="flex items-center justify-between gap-2 w-full max-w-6xl mx-auto">
        {/* Mobile/Tablet Left: Riego Logo (<1024px) */}
        <div className="flex items-center lg:hidden shrink-0">
          <Logo size="sm" tone="dark" showName={true} />
        </div>

        {/* Desktop Left: Greeting & Date (>=1024px) */}
        <div className="hidden lg:flex flex-col justify-center">
          <h1 className="text-xl font-semibold text-[#1B2D21] leading-tight">
            {greetingText}
          </h1>
          <p className="text-sm text-[#5F6E62]">
            {dateText}
          </p>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-2 shrink-0 ml-auto">
          {/* Help Button (shows text label on desktop) */}
          <button
            type="button"
            aria-label={STRINGS.helpButtonAria}
            className="h-10 sm:h-12 min-h-[40px] sm:min-h-[48px] px-2.5 sm:px-3 rounded-xl border border-[#D1CAAD] bg-[#FAF7EE] text-[#1B2D21] font-bold text-sm sm:text-base flex items-center justify-center gap-1.5 shadow-sm hover:bg-[#EFEAD8] active:scale-95 transition cursor-pointer"
            title={STRINGS.helpButtonAria}
          >
            <span className="text-base sm:text-lg">?</span>
            <span className="hidden sm:inline text-sm font-semibold">
              {STRINGS.helpLabel}
            </span>
          </button>

          {/* Language Switcher */}
          <div
            className="flex items-center h-10 sm:h-12 min-h-[40px] sm:min-h-[48px] bg-[#EFEAD8] rounded-xl p-0.5 sm:p-1 border border-[#D1CAAD]"
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
                  className={`h-8 sm:h-10 px-2 sm:px-3 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
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

          {/* Mobile/Tablet Right: Profile circle with tap popover menu (<1024px) */}
          <div className="relative flex items-center lg:hidden shrink-0">
            <button
              type="button"
              aria-label={STRINGS.profileAria}
              aria-expanded={isMenuOpen}
              onClick={() => setIsMenuOpen((prev) => !prev)}
              className="w-10 h-10 sm:w-11 sm:h-11 min-w-[40px] min-h-[40px] sm:min-w-[44px] sm:min-h-[44px] rounded-full bg-[#235334] text-[#FAF7EE] font-bold text-base sm:text-lg flex items-center justify-center shadow-sm active:scale-95 transition-transform shrink-0 cursor-pointer"
            >
              {farmerInitial}
            </button>

            {/* Popover dropdown menu */}
            {isMenuOpen && (
              <>
                {/* Backdrop to close menu on outside click */}
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsMenuOpen(false)}
                  aria-hidden="true"
                />
                <div
                  role="menu"
                  className="absolute right-0 top-12 z-50 w-56 bg-white rounded-2xl p-4 border border-[#DCD6C0] shadow-xl flex flex-col gap-3"
                >
                  <div className="flex flex-col border-b border-[#EFEAD8] pb-2">
                    <span className="font-bold text-[#1B2D21] text-base truncate">
                      {farmerName}
                    </span>
                    {formattedPhone && (
                      <span className="text-xs text-[#5F6E62] mt-0.5">
                        {formattedPhone}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setIsMenuOpen(false);
                      endSession();
                      router.push("/welcome");
                    }}
                    className="min-h-[44px] px-3 py-2 rounded-xl bg-[#FAF7EE] hover:bg-[#EFEAD8] active:scale-95 text-[#DC2626] font-semibold text-sm flex items-center gap-2.5 transition-all cursor-pointer"
                  >
                    <LogoutIcon className="w-4 h-4 text-[#DC2626]" />
                    <span>Log out</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
