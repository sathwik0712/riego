"use client";

// ErrorNotice component: Reusable error state card
// Shows a plain message with AlertIcon and a farmer-friendly "Try again" button (>= 56px tall)

import { AlertIcon } from "./icons";

interface ErrorNoticeProps {
  message: string;
  onRetry: () => void;
}

export default function ErrorNotice({ message, onRetry }: ErrorNoticeProps) {
  return (
    <div
      role="alert"
      className="w-full bg-white rounded-3xl p-6 shadow-sm border border-[#FCA5A5] flex flex-col items-center text-center gap-4"
    >
      {/* Alert icon circle (no emoji) */}
      <div className="w-12 h-12 rounded-full bg-[#FEE2E2] flex items-center justify-center text-[#DC2626]">
        <AlertIcon className="w-6 h-6" />
      </div>

      {/* Error message text */}
      <p className="text-base sm:text-lg font-medium text-[#1B2D21] max-w-md">
        {message}
      </p>

      {/* Accessible retry action button (at least 56px tall) */}
      <button
        type="button"
        onClick={onRetry}
        className="min-h-[56px] w-full sm:w-auto sm:px-8 py-3.5 rounded-2xl bg-[#235334] hover:bg-[#1A3E27] text-[#FAF7EE] font-bold text-base sm:text-lg shadow-sm active:scale-95 transition-all flex items-center justify-center cursor-pointer"
      >
        Try again
      </button>
    </div>
  );
}
