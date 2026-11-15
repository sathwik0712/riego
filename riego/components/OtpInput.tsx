"use client";

// Reusable 6-digit OTP input component
// Supports auto-focus, auto-advance, backspace navigation, and full 6-digit paste

import { useEffect, useRef } from "react";

interface OtpInputProps {
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
  hasError?: boolean;
}

export default function OtpInput({
  value,
  onChange,
  disabled = false,
  hasError = false,
}: OtpInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Auto-focus the first input box on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // Split the value string into an array of 6 characters
  const digits = Array.from({ length: 6 }, (_, i) => value[i] || "");

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (e.key === "Backspace") {
      e.preventDefault();
      const newDigits = [...digits];
      if (digits[index]) {
        // Clear current box
        newDigits[index] = "";
        onChange(newDigits.join(""));
      } else if (index > 0) {
        // Clear previous box and shift focus back
        newDigits[index - 1] = "";
        onChange(newDigits.join(""));
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    const char = e.target.value.replace(/\D/g, "").slice(-1);
    if (!char) return;

    const newDigits = [...digits];
    newDigits[index] = char;
    const combined = newDigits.join("");
    onChange(combined);

    // Auto-advance to next input box
    if (index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    e.preventDefault();
    const pasteData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasteData) return;

    onChange(pasteData);
    const focusIndex = Math.min(pasteData.length, 5);
    inputRefs.current[focusIndex]?.focus();
  };

  return (
    <div
      className="flex items-center justify-center gap-1.5 sm:gap-2.5 w-full"
      role="group"
      aria-label="6-digit verification code"
    >
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            inputRefs.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          autoComplete="one-time-code"
          value={digit}
          disabled={disabled}
          onChange={(e) => handleChange(index, e)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          aria-label={`Digit ${index + 1} of 6`}
          className={`w-11 sm:w-12 h-14 min-h-[56px] min-w-[42px] sm:min-w-[48px] text-2xl font-bold text-center rounded-2xl border-2 transition-all outline-none ${
            hasError
              ? "border-[#DC2626] bg-[#FEF2F2] text-[#991B1B] focus:ring-2 focus:ring-[#DC2626]/20"
              : "border-[#DCD6C0] bg-[#FAF7EE] text-[#1B2D21] focus:bg-white focus:border-[#235334] focus:ring-2 focus:ring-[#235334]/20"
          } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        />
      ))}
    </div>
  );
}
