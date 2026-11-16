"use client";

// ManualReadingModal component
// Accessible pop-up dialog / bottom sheet for recording soil moisture manually.
// Replaces the standalone /fields/[id]/reading page.
// Phone: bottom sheet (max-height 90vh, scrollable).
// Desktop: centered card (max-width ~480px, rounded-3xl).

import { useEffect, useRef, useState } from "react";
import { addManualReading } from "@/lib/api";
import { AlertIcon, CheckIcon, CloseIcon, CloudRainIcon, DropIcon, SunIcon } from "./icons";

interface ManualReadingModalProps {
  field: {
    id: number;
    name?: string | null;
    nickname?: string | null;
    crop: string;
  };
  onClose: () => void;
  onSaved: () => void;
}

// Preset card definition
interface Preset {
  label: string;
  value: number;
  icon: typeof SunIcon;
  hint: string;
}

const PRESETS: Preset[] = [
  { label: "Dry", value: 20, icon: SunIcon, hint: "Crumbly" },
  { label: "Okay", value: 50, icon: DropIcon, hint: "Damp" },
  { label: "Wet", value: 80, icon: CloudRainIcon, hint: "Sticky" },
];

export default function ManualReadingModal({
  field,
  onClose,
  onSaved,
}: ManualReadingModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Form input state
  const [moistureInput, setMoistureInput] = useState<string>("");
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Success view state
  const [isSuccess, setIsSuccess] = useState(false);
  const [savedValue, setSavedValue] = useState<number | null>(null);

  // Field display title
  const fieldName =
    field.nickname?.trim() || field.name?.trim() || `Field ${field.id}`;

  // ── Focus management, scroll lock, and Escape key handling ──
  useEffect(() => {
    // Save current active element to restore focus on close
    const previousActiveElement = document.activeElement as HTMLElement | null;

    // Prevent underlying page scrolling
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Set initial focus to the input or the close button
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 50);

    // Escape key listener
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      // Simple focus trap within the dialog
      if (e.key === "Tab" && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      clearTimeout(timer);
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      // Return keyboard focus to the triggering element
      previousActiveElement?.focus();
    };
  }, [onClose]);

  // Handle preset card click
  const handlePresetSelect = (preset: Preset) => {
    setSelectedPreset(preset.label);
    setMoistureInput(String(preset.value));
    setValidationError(null);
    setSaveError(null);
    inputRef.current?.focus();
  };

  // Handle number input change — allow digits and at most one decimal point
  const handleInputChange = (val: string) => {
    let clean = val.replace(/[^0-9.]/g, "");
    const parts = clean.split(".");
    if (parts.length > 2) {
      clean = parts[0] + "." + parts.slice(1).join("");
    }
    setMoistureInput(clean);
    setValidationError(null);
    setSaveError(null);

    // Highlight preset card if typed value matches a preset
    if (clean === "20") setSelectedPreset("Dry");
    else if (clean === "50") setSelectedPreset("Okay");
    else if (clean === "80") setSelectedPreset("Wet");
    else setSelectedPreset(null);
  };

  // Submit manual reading
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setSaveError(null);

    const trimmed = moistureInput.trim();
    if (!trimmed) {
      setValidationError("Enter a number from 0 to 100");
      return;
    }

    const num = parseFloat(trimmed);
    if (isNaN(num) || num < 0 || num > 100) {
      setValidationError("Enter a number from 0 to 100");
      return;
    }

    setIsSaving(true);
    try {
      const res = await addManualReading(field.id, num);
      setSavedValue(res.moisture_percent);
      setIsSuccess(true);
      // Notify parent to refresh conditions and history for this field
      onSaved();
    } catch (err: any) {
      // Keep typed value intact on failure
      setSaveError(err?.message || "Could not save reading. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to record another reading
  const handleEnterAnother = () => {
    setIsSuccess(false);
    setMoistureInput("");
    setSelectedPreset(null);
    setValidationError(null);
    setSaveError(null);
    setSavedValue(null);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  return (
    // ── Dark transparent overlay (tapping it dismisses the modal) ──
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 transition-opacity"
      aria-hidden="false"
    >
      {/* ── Dialog Container: bottom sheet on phone, centered card on tablet/desktop ── */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="manual-reading-title"
        className="w-full sm:max-w-[480px] max-h-[90vh] overflow-y-auto bg-white rounded-t-3xl sm:rounded-3xl p-6 shadow-xl border border-[#DCD6C0] flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-4 duration-200 motion-reduce:animate-none motion-reduce:transition-none"
      >
        {/* ── Header: Title, field info, and accessible 56px Close button ── */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#F2EFE4]">
          <div className="flex flex-col gap-0.5 min-w-0">
            <h2
              id="manual-reading-title"
              className="text-xl sm:text-2xl font-extrabold text-[#1B2D21] leading-tight"
            >
              Enter soil moisture
            </h2>
            <p className="text-sm font-medium text-[#5F6E62] truncate">
              {fieldName} · {field.crop}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="min-w-[56px] min-h-[56px] w-14 h-14 rounded-2xl flex items-center justify-center text-[#5F6E62] hover:text-[#1B2D21] hover:bg-[#FAF7EE] active:scale-95 transition-all shrink-0 cursor-pointer"
          >
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>

        {/* ── Success view inside the pop-up ── */}
        {isSuccess ? (
          <div className="flex flex-col items-center text-center gap-4 py-2">
            <div className="w-16 h-16 rounded-3xl bg-[#EAF5EB] border border-[#A3D9A5] flex items-center justify-center text-[#1E5128]">
              <CheckIcon className="w-8 h-8" />
            </div>

            <div className="flex flex-col gap-1">
              <h3 className="text-xl font-extrabold text-[#1B2D21]">
                Reading saved
              </h3>
              <p className="text-base text-[#5F6E62]">
                Moisture recorded:{" "}
                <span className="font-bold text-[#1B2D21]">{savedValue}%</span>
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full mt-2">
              <button
                type="button"
                onClick={onClose}
                className="min-h-[56px] flex-1 inline-flex items-center justify-center px-6 py-3.5 rounded-2xl bg-[#235334] text-[#FAF7EE] font-bold text-base hover:bg-[#1A3E27] active:scale-95 transition-all cursor-pointer"
              >
                Done
              </button>
              <button
                type="button"
                onClick={handleEnterAnother}
                className="min-h-[56px] flex-1 inline-flex items-center justify-center px-6 py-3.5 rounded-2xl bg-[#FAF7EE] border border-[#DCD6C0] text-[#235334] font-bold text-base hover:bg-[#F2EDDC] active:scale-95 transition-all cursor-pointer"
              >
                Enter another
              </button>
            </div>
          </div>
        ) : (
          // ── Form view ──
          <form onSubmit={handleSave} className="flex flex-col gap-5">
            {/* Three quick estimate tap cards: Dry (20), Okay (50), Wet (80) */}
            <div className="flex flex-col gap-2">
              <span className="text-sm font-bold text-[#1B2D21]">
                Quick estimate
              </span>
              <div className="grid grid-cols-3 gap-2.5">
                {PRESETS.map((p) => {
                  const IconComponent = p.icon;
                  const isSelected = selectedPreset === p.label;
                  return (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => handlePresetSelect(p)}
                      className={`min-h-[96px] p-2.5 rounded-2xl flex flex-col items-center justify-between text-center transition-all cursor-pointer border ${
                        isSelected
                          ? "border-2 border-[#235334] bg-[#FAF7EE] shadow-sm"
                          : "border-[#DCD6C0] bg-white hover:bg-[#FAF7EE]/60"
                      }`}
                    >
                      {/* Top icon and check badge (colour is never the only signal) */}
                      <div className="w-full flex items-center justify-between px-1">
                        <IconComponent
                          className={`w-5 h-5 ${
                            isSelected ? "text-[#235334]" : "text-[#5F6E62]"
                          }`}
                        />
                        {isSelected ? (
                          <span className="w-4 h-4 rounded-full bg-[#235334] text-[#FAF7EE] flex items-center justify-center shrink-0">
                            <CheckIcon className="w-3 h-3" />
                          </span>
                        ) : (
                          <span className="w-4 h-4" aria-hidden="true" />
                        )}
                      </div>

                      {/* Word + Percentage */}
                      <div className="flex flex-col items-center">
                        <span className="text-sm font-bold text-[#1B2D21] leading-tight">
                          {p.label}
                        </span>
                        <span className="text-xs text-[#5F6E62] mt-0.5">
                          ~{p.value}%
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Big number input with "%" label */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="modal-moisture-input"
                className="text-sm font-bold text-[#1B2D21]"
              >
                Moisture percentage (0 to 100)
              </label>
              <div className="relative flex items-center">
                <input
                  ref={inputRef}
                  id="modal-moisture-input"
                  type="text"
                  inputMode="decimal"
                  value={moistureInput}
                  onChange={(e) => handleInputChange(e.target.value)}
                  placeholder="e.g. 45"
                  className="w-full text-2xl sm:text-3xl font-extrabold text-[#1B2D21] bg-white border border-[#DCD6C0] rounded-2xl p-3.5 pr-12 focus:outline-none focus:ring-2 focus:ring-[#235334] focus:border-transparent transition-all placeholder:text-[#D1CAAD]"
                />
                <span className="absolute right-4 text-xl sm:text-2xl font-bold text-[#5F6E62] pointer-events-none">
                  %
                </span>
              </div>
            </div>

            {/* Validation error with AlertIcon */}
            {validationError && (
              <div
                role="alert"
                className="flex items-center gap-2 text-sm font-bold text-[#991B1B] bg-[#FEE2E2] border border-[#FCA5A5] p-3 rounded-2xl"
              >
                <AlertIcon className="w-4 h-4 shrink-0 text-[#DC2626]" />
                <span>{validationError}</span>
              </div>
            )}

            {/* API error with AlertIcon */}
            {saveError && (
              <div
                role="alert"
                className="flex items-center gap-2 text-sm font-bold text-[#991B1B] bg-[#FEE2E2] border border-[#FCA5A5] p-3 rounded-2xl"
              >
                <AlertIcon className="w-4 h-4 shrink-0 text-[#DC2626]" />
                <span>{saveError}</span>
              </div>
            )}

            {/* Help tip line */}
            <div className="bg-[#FAF7EE] border border-[#DCD6C0] p-3.5 rounded-2xl text-xs text-[#5F6E62] leading-relaxed">
              <span className="font-bold text-[#235334]">Tip: </span>
              Push a finger about 5 cm into the soil. Crumbly and dry is about
              20, damp is about 50, wet and sticky is about 80.
            </div>

            {/* Full-width 56px Save reading button */}
            <button
              type="submit"
              disabled={isSaving}
              className="w-full min-h-[56px] rounded-2xl bg-[#235334] hover:bg-[#1A3E27] active:scale-95 text-[#FAF7EE] font-bold text-base shadow-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer"
            >
              {isSaving ? "Saving..." : "Save reading"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
