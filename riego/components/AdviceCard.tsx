"use client";

// AdviceCard: Per-field advice slider
// Shows one advice item at a time (one per field).
// Navigation: visible arrow buttons, dots, "1 of N" counter, left/right keys, touch swipe.
// No looping at ends. No auto-slide. Respects prefers-reduced-motion.
// Steady card height so the page below never jumps.
// Offline: shows last cached advice with "Last updated" banner if usingCache is true.

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import { STRINGS } from "../lib/strings";
import { ClockIcon, DropIcon, SpeakerIcon, CheckIcon } from "./icons";
import { AdviceItem } from "../lib/types";

interface AdviceCardProps {
  items: AdviceItem[];
  usingCache?: boolean;
  lastUpdatedLabel?: string;
  onOpenManualReading?: (field: {
    id: number;
    name?: string | null;
    nickname?: string | null;
    crop: string;
  }) => void;
}

// Left chevron icon — inline so no extra file needed
function ChevronLeftIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function ChevronRightIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

export default function AdviceCard({
  items,
  usingCache = false,
  lastUpdatedLabel,
  onOpenManualReading,
}: AdviceCardProps) {
  const [index, setIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Touch swipe state
  const touchStartX = useRef<number | null>(null);

  // Clamp index whenever items length changes
  useEffect(() => {
    setIndex((prev) => Math.min(prev, Math.max(0, items.length - 1)));
  }, [items.length]);

  const goTo = useCallback(
    (next: number) => {
      if (next < 0 || next >= items.length) return;
      setIndex(next);
    },
    [items.length]
  );

  // Keyboard navigation
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      // Only when no input is focused
      if (
        document.activeElement &&
        ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName)
      )
        return;
      if (e.key === "ArrowLeft") goTo(index - 1);
      if (e.key === "ArrowRight") goTo(index + 1);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [index, goTo]);

  // Visual simulation for speaker feedback
  const handleSpeakerClick = () => {
    setIsPlaying(true);
    setTimeout(() => setIsPlaying(false), 1200);
  };

  // Touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = (e.changedTouches[0]?.clientX ?? 0) - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < 40) return; // ignore tiny swipes
    if (dx < 0) goTo(index + 1); // swipe left → next
    else goTo(index - 1);         // swipe right → previous
  };

  // Edge case: no items at all
  if (items.length === 0) {
    return (
      <section
        aria-label="Today's Irrigation Advice"
        className="relative w-full h-full flex flex-col justify-center bg-[#1A3E27] text-[#FAF7EE] rounded-3xl p-5 sm:p-6 shadow-sm border border-[#2D6A4F] overflow-hidden"
        style={{ background: "linear-gradient(135deg, #1A3E27 60%, #0F2D1A 100%)", isolation: "isolate" }}
      >
        <div className="absolute -top-6 -right-6 w-32 h-32 lg:w-40 lg:h-40 bg-[#2D6A4F]/40 rounded-full blur-xl pointer-events-none" aria-hidden="true" />
        <div className="flex flex-col gap-2 relative z-10">
          <div className="flex items-center gap-2">
            <DropIcon className="w-6 h-6 text-[#A3E635]" />
            <span className="text-sm font-bold uppercase tracking-wider text-[#A3E635] bg-[#0E2818] px-3 py-1 rounded-full border border-[#2D6A4F]">
              {STRINGS.adviceHeader}
            </span>
          </div>
          <p className="text-xl sm:text-2xl lg:text-3xl font-bold leading-snug text-white mt-2">
            Loading irrigation recommendations...
          </p>
        </div>
      </section>
    );
  }

  const item = items[index];
  const single = items.length === 1;
  const canPrev = index > 0;
  const canNext = index < items.length - 1;

  return (
    <section
      aria-label="Today's Irrigation Advice"
      className="relative w-full h-full flex flex-col bg-[#1A3E27] text-[#FAF7EE] rounded-3xl shadow-sm border border-[#2D6A4F] overflow-hidden"
      style={{ background: "linear-gradient(135deg, #1A3E27 60%, #0F2D1A 100%)", isolation: "isolate", minHeight: "220px" }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Decorative blurred circle */}
      <div
        className="absolute -top-6 -right-6 w-32 h-32 lg:w-40 lg:h-40 bg-[#2D6A4F]/40 rounded-full blur-xl pointer-events-none"
        aria-hidden="true"
      />

      {/* Faint decorative drop icon, desktop only */}
      <div
        className="hidden lg:block absolute bottom-2 right-4 opacity-10 pointer-events-none select-none"
        aria-hidden="true"
      >
        <DropIcon className="w-24 h-24 text-white" />
      </div>

      {/* Offline cache notice */}
      {usingCache && (
        <div className="relative z-10 mx-5 mt-4 flex items-center gap-2 bg-white/10 rounded-2xl px-3 py-2 text-xs text-[#FAF7EE]/80 border border-white/15">
          <ClockIcon className="w-4 h-4 shrink-0 text-[#FAF7EE]/70" />
          <span>Last updated {lastUpdatedLabel || "recently"}</span>
        </div>
      )}

      {/* Main content — flex-1 so height is shared evenly */}
      <div className="relative z-10 flex flex-col flex-1 p-5 sm:p-6 gap-4">
        {/* Header: badge + field name + counter + speaker */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <DropIcon className="w-5 h-5 text-[#A3E635] shrink-0" />
              <span className="text-xs font-bold uppercase tracking-wider text-[#A3E635] bg-[#0E2818] px-3 py-1 rounded-full border border-[#2D6A4F]">
                {STRINGS.adviceHeader}
              </span>
              {!single && (
                <span
                  aria-live="polite"
                  aria-atomic="true"
                  className="text-xs font-semibold text-[#FAF7EE]/60 ml-1"
                >
                  {index + 1} of {items.length}
                </span>
              )}
            </div>
            <p className="text-sm font-semibold text-[#A3E635]/80 truncate mt-0.5">
              {item.fieldName}
            </p>
          </div>

          {/* Speaker button — visual only */}
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

        {/* Advice sentence */}
        <div className="flex-1 flex flex-col justify-center gap-3">
          <div className="flex items-start gap-3">
            {/* Kind-specific icon */}
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0 mt-0.5 border border-white/15">
              {item.kind === "done" ? (
                <CheckIcon className="w-5 h-5 text-[#A3E635]" />
              ) : item.kind === "water" ? (
                <DropIcon className="w-5 h-5 text-[#A3E635]" />
              ) : item.kind === "needs_reading" ? (
                <ClockIcon className="w-5 h-5 text-[#FCD34D]" />
              ) : (
                <DropIcon className="w-5 h-5 text-[#A3E635]" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-lg sm:text-xl lg:text-2xl font-bold leading-snug text-white">
                {item.sentence}
              </p>
            </div>
          </div>

          {/* Action buttons — per kind */}
          {item.kind === "water" && item.moreCount && item.moreCount > 0 ? (
            <Link
              href="/plan"
              className="self-start inline-flex items-center justify-center min-h-[44px] px-4 py-2 rounded-full bg-[#A3E635] text-[#0E2818] font-bold text-xs uppercase tracking-wider hover:bg-[#8CD321] active:scale-95 transition-all shadow-sm border border-white/20"
              aria-label={`View ${item.moreCount} more scheduled irrigation sessions`}
            >
              +{item.moreCount} more
            </Link>
          ) : item.kind === "needs_reading" && item.readingField && onOpenManualReading ? (
            <button
              type="button"
              onClick={() => onOpenManualReading(item.readingField!)}
              className="self-start inline-flex items-center justify-center min-h-[56px] px-6 py-3 rounded-2xl bg-[#A3E635] hover:bg-[#8CD321] active:scale-95 text-[#0E2818] font-bold text-sm shadow-sm transition-all cursor-pointer border border-white/20"
            >
              Enter soil reading
            </button>
          ) : null}
        </div>

        {/* Footer: arrows + dots (hidden when single item) */}
        {!single && (
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/10">
            {/* Previous arrow */}
            <button
              type="button"
              onClick={() => goTo(index - 1)}
              disabled={!canPrev}
              aria-label="Previous advice"
              className={`min-w-[56px] min-h-[56px] flex items-center justify-center rounded-2xl border transition-all ${
                canPrev
                  ? "bg-[#2D6A4F] text-white hover:bg-[#3D8B65] active:scale-95 border-[#459C72] cursor-pointer"
                  : "bg-white/5 text-white/20 border-white/10 cursor-not-allowed"
              }`}
            >
              <ChevronLeftIcon className="w-5 h-5" />
            </button>

            {/* Dot indicators */}
            <div className="flex items-center gap-1.5" role="tablist" aria-label="Advice items">
              {items.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  role="tab"
                  aria-selected={i === index}
                  aria-label={`Advice ${i + 1} of ${items.length}`}
                  onClick={() => goTo(i)}
                  className={`rounded-full transition-all duration-150 motion-reduce:transition-none cursor-pointer ${
                    i === index
                      ? "w-4 h-2.5 bg-[#A3E635]"
                      : "w-2.5 h-2.5 bg-white/30 hover:bg-white/50"
                  }`}
                />
              ))}
            </div>

            {/* Next arrow */}
            <button
              type="button"
              onClick={() => goTo(index + 1)}
              disabled={!canNext}
              aria-label="Next advice"
              className={`min-w-[56px] min-h-[56px] flex items-center justify-center rounded-2xl border transition-all ${
                canNext
                  ? "bg-[#2D6A4F] text-white hover:bg-[#3D8B65] active:scale-95 border-[#459C72] cursor-pointer"
                  : "bg-white/5 text-white/20 border-white/10 cursor-not-allowed"
              }`}
            >
              <ChevronRightIcon className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
