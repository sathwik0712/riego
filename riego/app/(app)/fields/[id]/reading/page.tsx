"use client";

// Enter Soil Moisture Reading Page (/fields/[id]/reading)
// Allows farmers to manually record soil moisture for fields without sensors or with offline hardware.
// Supports quick presets (Dry=20, Okay=50, Wet=80) or custom numerical entry (0-100%).

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { getField, addManualReading } from "@/lib/api";
import { BackendField } from "@/lib/types";
import LoadingCard from "@/components/LoadingCard";
import ErrorNotice from "@/components/ErrorNotice";
import { AlertIcon, CheckIcon, CloudRainIcon, DropIcon, SunIcon } from "@/components/icons";

interface ReadingPageProps {
  params: Promise<{ id: string }>;
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

export default function ManualReadingPage({ params }: ReadingPageProps) {
  const resolvedParams = use(params);
  const fieldId = Number(resolvedParams?.id);

  const [field, setField] = useState<BackendField | null>(null);
  const [loadingField, setLoadingField] = useState(true);
  const [fieldError, setFieldError] = useState<string | null>(null);

  // Form input state
  const [moistureInput, setMoistureInput] = useState<string>("");
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Success view state
  const [isSuccess, setIsSuccess] = useState(false);
  const [savedValue, setSavedValue] = useState<number | null>(null);

  // Fetch field details
  const loadField = async () => {
    if (isNaN(fieldId) || fieldId <= 0) {
      setFieldError("Invalid field ID.");
      setLoadingField(false);
      return;
    }

    setLoadingField(true);
    setFieldError(null);
    try {
      const data = await getField(fieldId);
      setField(data);
    } catch (err: any) {
      setFieldError(err?.message || "Field not found.");
    } finally {
      setLoadingField(false);
    }
  };

  useEffect(() => {
    loadField();
  }, [fieldId]);

  // Handle preset card click
  const handlePresetSelect = (preset: Preset) => {
    setSelectedPreset(preset.label);
    setMoistureInput(String(preset.value));
    setValidationError(null);
    setSaveError(null);
  };

  // Handle number input change — allow digits and up to one decimal point only
  const handleInputChange = (val: string) => {
    let clean = val.replace(/[^0-9.]/g, "");
    const parts = clean.split(".");
    if (parts.length > 2) {
      clean = parts[0] + "." + parts.slice(1).join("");
    }
    setMoistureInput(clean);
    setValidationError(null);
    setSaveError(null);

    // Sync preset highlight if typed value matches a preset exactly
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

    // Validate only when Save reading is tapped
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
      const res = await addManualReading(fieldId, num);
      setSavedValue(res.moisture_percent);
      setIsSuccess(true);
    } catch (err: any) {
      setSaveError(err?.message || "Could not save reading. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // Reset form to record another reading
  const handleEnterAnother = () => {
    setIsSuccess(false);
    setMoistureInput("");
    setSelectedPreset(null);
    setValidationError(null);
    setSaveError(null);
    setSavedValue(null);
  };

  // Field display name
  const fieldName = field?.nickname?.trim() || (field ? `Field ${field.id}` : `Field ${fieldId}`);

  return (
    <div className="w-full max-w-[600px] mx-auto py-2 sm:py-4 flex flex-col gap-6">
      {/* ── Top back navigation link (>=56px tap area) ── */}
      <div>
        <Link
          href="/fields"
          className="min-h-[56px] inline-flex items-center gap-2 text-base font-bold text-[#235334] hover:text-[#1A3E27] py-2 px-1 rounded-xl transition-colors cursor-pointer"
        >
          <span aria-hidden="true">←</span>
          <span>Back to fields</span>
        </Link>
      </div>

      {/* ── Loading state ── */}
      {loadingField ? (
        <LoadingCard />
      ) : fieldError || !field ? (
        // ── Error state if field cannot be reached or does not exist ──
        <ErrorNotice
          message={fieldError || "Field not found."}
          onRetry={loadField}
        />
      ) : isSuccess ? (
        // ── Success state card ──
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#DCD6C0] shadow-sm flex flex-col items-center text-center gap-5">
          <div className="w-16 h-16 rounded-3xl bg-[#EAF5EB] border border-[#A3D9A5] flex items-center justify-center text-[#1E5128]">
            <CheckIcon className="w-8 h-8" />
          </div>

          <div className="flex flex-col gap-1">
            <h2 className="text-2xl font-extrabold text-[#1B2D21]">Reading saved</h2>
            <p className="text-base text-[#5F6E62]">
              Moisture recorded:{" "}
              <span className="font-bold text-[#1B2D21]">{savedValue}%</span>
            </p>
            <p className="text-xs text-[#5F6E62] mt-0.5">
              {fieldName} · {field.crop}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full mt-2">
            <Link
              href="/fields"
              className="min-h-[56px] flex-1 inline-flex items-center justify-center px-6 py-3.5 rounded-2xl bg-[#235334] text-[#FAF7EE] font-bold text-base hover:bg-[#1A3E27] active:scale-95 transition-all cursor-pointer"
            >
              Back to fields
            </Link>
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
        // ── Main manual entry form ──
        <form onSubmit={handleSave} className="bg-white rounded-3xl p-6 sm:p-8 border border-[#DCD6C0] shadow-sm flex flex-col gap-6">
          {/* Header with Title and field metadata */}
          <div className="flex flex-col gap-1 pb-4 border-b border-[#F2EFE4]">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1B2D21]">
              Enter soil moisture
            </h1>
            <p className="text-sm font-medium text-[#5F6E62]">
              {fieldName} · {field.crop}
            </p>
          </div>

          {/* Three big tap cards: Dry (20), Okay (50), Wet (80) */}
          <div className="flex flex-col gap-2">
            <span className="text-sm font-bold text-[#1B2D21]">
              Quick estimate
            </span>
            <div className="grid grid-cols-3 gap-3">
              {PRESETS.map((p) => {
                const IconComponent = p.icon;
                const isSelected = selectedPreset === p.label;
                return (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => handlePresetSelect(p)}
                    className={`min-h-[104px] p-3 rounded-2xl flex flex-col items-center justify-between text-center transition-all cursor-pointer border ${
                      isSelected
                        ? "border-2 border-[#235334] bg-[#FAF7EE] shadow-sm"
                        : "border-[#DCD6C0] bg-white hover:bg-[#FAF7EE]/60"
                    }`}
                  >
                    {/* Top row: Icon + optional CheckIcon badge so colour is never the only signal */}
                    <div className="w-full flex items-center justify-between px-1">
                      <IconComponent className={`w-6 h-6 ${isSelected ? "text-[#235334]" : "text-[#5F6E62]"}`} />
                      {isSelected ? (
                        <span className="w-5 h-5 rounded-full bg-[#235334] text-[#FAF7EE] flex items-center justify-center shrink-0">
                          <CheckIcon className="w-3.5 h-3.5" />
                        </span>
                      ) : (
                        <span className="w-5 h-5" aria-hidden="true" />
                      )}
                    </div>

                    {/* Word + Percentage */}
                    <div className="flex flex-col items-center">
                      <span className="text-base font-bold text-[#1B2D21] leading-tight">
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
          <div className="flex flex-col gap-2">
            <label htmlFor="moisture-input" className="text-sm font-bold text-[#1B2D21]">
              Moisture percentage (0 to 100)
            </label>
            <div className="relative flex items-center">
              <input
                id="moisture-input"
                type="text"
                inputMode="decimal"
                value={moistureInput}
                onChange={(e) => handleInputChange(e.target.value)}
                placeholder="e.g. 45"
                className="w-full text-3xl font-extrabold text-[#1B2D21] bg-white border border-[#DCD6C0] rounded-2xl p-4 pr-12 focus:outline-none focus:ring-2 focus:ring-[#235334] focus:border-transparent transition-all placeholder:text-[#D1CAAD]"
              />
              <span className="absolute right-4 text-2xl font-bold text-[#5F6E62] pointer-events-none">
                %
              </span>
            </div>
          </div>

          {/* Validation error banner with AlertIcon */}
          {validationError && (
            <div
              role="alert"
              className="flex items-center gap-2.5 text-sm font-bold text-[#991B1B] bg-[#FEE2E2] border border-[#FCA5A5] p-3.5 rounded-2xl"
            >
              <AlertIcon className="w-4 h-4 shrink-0 text-[#DC2626]" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Backend failure error banner with AlertIcon */}
          {saveError && (
            <div
              role="alert"
              className="flex items-center gap-2.5 text-sm font-bold text-[#991B1B] bg-[#FEE2E2] border border-[#FCA5A5] p-3.5 rounded-2xl"
            >
              <AlertIcon className="w-4 h-4 shrink-0 text-[#DC2626]" />
              <span>{saveError}</span>
            </div>
          )}

          {/* Short plain farmer-friendly finger test help line */}
          <div className="bg-[#FAF7EE] border border-[#DCD6C0] p-4 rounded-2xl text-xs sm:text-sm text-[#5F6E62] leading-relaxed">
            <span className="font-bold text-[#235334]">Tip: </span>
            Push a finger about 5 cm into the soil. Crumbly and dry is about 20, damp is about 50, wet and sticky is about 80.
          </div>

          {/* Full-width 56px Save reading button */}
          <button
            type="submit"
            disabled={isSaving}
            className="w-full min-h-[56px] rounded-2xl bg-[#235334] hover:bg-[#1A3E27] active:scale-95 text-[#FAF7EE] font-bold text-base sm:text-lg shadow-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer"
          >
            {isSaving ? "Saving..." : "Save reading"}
          </button>
        </form>
      )}
    </div>
  );
}
