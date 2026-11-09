"use client";

// Field Registration Form Component (SRS Section 4.4)
// Multi-step form with all 5 screens, mobile-first design, tap-friendly option cards,
// step validation, growth stage calculation, and in-memory saving.

import { useState } from "react";
import Link from "next/link";
import { FieldFormData } from "../lib/types";
import {
  areaUnitOptions,
  cropOptions,
  initialFieldFormData,
  irrigationMethodOptions,
  soilTypeOptions,
  waterSourceOptions,
} from "../lib/sampleData";
import { createField } from "../lib/api";

// Step titles and icons for the progress indicator
const STEP_CONFIG = [
  { step: 1, title: "Field Basics", icon: "📍" },
  { step: 2, title: "Crop", icon: "🌾" },
  { step: 3, title: "Soil & Water", icon: "🌱" },
  { step: 4, title: "Sensor Device", icon: "📡" },
  { step: 5, title: "Review & Save", icon: "📋" },
];

// Helper: Calculate crop growth stage based on sowing date
function calculateGrowthStage(sowingDate: string, notSownYet: boolean): string {
  if (notSownYet || !sowingDate) {
    return "Not sown yet (Planning stage)";
  }
  const sowing = new Date(sowingDate);
  const today = new Date();
  const diffTime = today.getTime() - sowing.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return "Scheduled for future sowing";
  } else if (diffDays <= 20) {
    return "Initial Stage (Germination & Seedling)";
  } else if (diffDays <= 50) {
    return "Vegetative Stage (Active Foliage)";
  } else {
    return "Mid-Season / Flowering Stage";
  }
}

export default function FieldRegistrationForm() {
  // Current active step (1 to 5)
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Form state holding all data across all 5 steps
  const [formData, setFormData] = useState<FieldFormData>(initialFieldFormData);

  // Validation error message for the current step
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // State to display the post-save success screen
  const [isSaved, setIsSaved] = useState<boolean>(false);

  // Helper to update specific form fields
  const updateField = <K extends keyof FieldFormData>(
    field: K,
    value: FieldFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errorMessage) {
      setErrorMessage(null);
    }
  };

  // --- Step Validations ---

  // Screen 1: Field basics
  const validateScreen1 = (): boolean => {
    if (!formData.location.trim()) {
      setErrorMessage("Please choose a location (Current GPS or Map) to continue.");
      return false;
    }
    if (formData.areaSize === "" || Number(formData.areaSize) <= 0) {
      setErrorMessage("Please enter a valid field area size (greater than 0).");
      return false;
    }
    return true;
  };

  // Screen 2: Crop
  const validateScreen2 = (): boolean => {
    if (!formData.cropName) {
      setErrorMessage("Please select a crop from the options below.");
      return false;
    }
    if (!formData.sowingDate && !formData.notSownYet) {
      setErrorMessage("Please choose a sowing date or select 'Not sown yet'.");
      return false;
    }
    return true;
  };

  // Screen 3: Soil and water
  const validateScreen3 = (): boolean => {
    if (!formData.soilType) {
      setErrorMessage("Please select your field soil type.");
      return false;
    }
    if (!formData.waterSource) {
      setErrorMessage("Please select your primary water source.");
      return false;
    }
    if (!formData.irrigationMethod) {
      setErrorMessage("Please select your irrigation method.");
      return false;
    }
    return true;
  };

  // Screen 4: Sensor device
  const validateScreen4 = (): boolean => {
    if (formData.hasSensor === null) {
      setErrorMessage("Please select whether a sensor device is installed.");
      return false;
    }
    if (formData.hasSensor === true && !formData.deviceId.trim()) {
      setErrorMessage("Please enter the Device ID for your installed sensor.");
      return false;
    }
    return true;
  };

  // Advance to next step after validating current screen
  const handleNext = () => {
    let isValid = true;
    if (currentStep === 1) isValid = validateScreen1();
    else if (currentStep === 2) isValid = validateScreen2();
    else if (currentStep === 3) isValid = validateScreen3();
    else if (currentStep === 4) isValid = validateScreen4();

    if (isValid) {
      setErrorMessage(null);
      setCurrentStep((prev) => Math.min(prev + 1, 5));
    }
  };

  // Move back to previous step
  const handleBack = () => {
    setErrorMessage(null);
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  // Screen 5: Save field in memory and show success screen
  const handleSaveField = async () => {
    const stage = calculateGrowthStage(formData.sowingDate, formData.notSownYet);
    const finalData: FieldFormData = {
      ...formData,
      growthStage: stage,
      registrationDate: new Date().toISOString().split("T")[0],
    };

    // Save into in-memory sample fields
    await createField(finalData);
    setIsSaved(true);
  };

  // Reset form to register another field
  const handleRegisterAnother = () => {
    const nextId = `fld-${Math.floor(100 + Math.random() * 900)}`;
    setFormData({
      ...initialFieldFormData,
      id: nextId,
    });
    setCurrentStep(1);
    setIsSaved(false);
    setErrorMessage(null);
  };

  // -------------------------------------------------------------
  // SUCCESS SCREEN (After saving field)
  // -------------------------------------------------------------
  if (isSaved) {
    const stage = calculateGrowthStage(formData.sowingDate, formData.notSownYet);
    const displayName = formData.nickname.trim() || `Field ${formData.id}`;

    return (
      <div className="bg-white rounded-3xl p-6 sm:p-10 border border-[#DCD6C0] shadow-sm flex flex-col items-center text-center gap-6">
        {/* Success badge */}
        <div className="w-20 h-20 rounded-3xl bg-[#EAF5EB] border-2 border-[#A3D9A5] flex items-center justify-center text-4xl shadow-sm">
          ✅
        </div>

        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#2E7D32] bg-[#EAF5EB] px-3.5 py-1 rounded-full border border-[#A3D9A5]">
            ✓ Registration Complete
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1B2D21] mt-3">
            Field Saved Successfully!
          </h2>
          <p className="text-sm sm:text-base text-[#5F6E62] max-w-md mt-2">
            <strong className="text-[#1B2D21]">{displayName}</strong> has been
            saved to your farm profile. Weather and moisture telemetry are now active.
          </p>
        </div>

        {/* Saved field key specs card */}
        <div className="w-full bg-[#FAF7EE] rounded-2xl p-4 sm:p-5 border border-[#D1CAAD] text-left flex flex-col gap-2.5">
          <div className="flex items-center justify-between border-b border-[#EFEAD8] pb-2">
            <span className="text-xs font-bold uppercase text-[#5F6E62]">Field ID</span>
            <span className="text-sm font-mono font-bold text-[#1B2D21]">
              🏷️ {formData.id}
            </span>
          </div>
          <div className="flex items-center justify-between border-b border-[#EFEAD8] pb-2">
            <span className="text-xs font-bold uppercase text-[#5F6E62]">Crop & Stage</span>
            <span className="text-sm font-bold text-[#235334]">
              🌾 {formData.cropName} ({stage})
            </span>
          </div>
          <div className="flex items-center justify-between border-b border-[#EFEAD8] pb-2">
            <span className="text-xs font-bold uppercase text-[#5F6E62]">Total Area</span>
            <span className="text-sm font-bold text-[#1B2D21]">
              📐 {formData.areaSize} {formData.areaUnit}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-[#5F6E62]">Sensor Device</span>
            <span className="text-sm font-bold text-[#1B2D21]">
              {formData.hasSensor ? `📡 ${formData.deviceId}` : "⏳ None (Can add later)"}
            </span>
          </div>
        </div>

        {/* Action buttons (at least 56px tall) */}
        <div className="w-full flex flex-col sm:flex-row gap-3 pt-2">
          <Link
            href="/fields"
            className="flex-1 min-h-[56px] px-6 py-3 rounded-2xl bg-[#235334] text-[#FAF7EE] font-bold text-base shadow-sm hover:bg-[#1A3E27] active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span aria-hidden="true">←</span>
            <span>Back to My Fields</span>
          </Link>

          <button
            type="button"
            onClick={handleRegisterAnother}
            className="min-h-[56px] px-6 py-3 rounded-2xl border-2 border-[#DCD6C0] bg-white text-[#1B2D21] font-bold text-base hover:bg-[#FAF7EE] active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span aria-hidden="true">＋</span>
            <span>Register Another</span>
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // MULTI-STEP FORM SHELL (Screens 1 to 5)
  // -------------------------------------------------------------
  return (
    <div className="flex flex-col gap-6">
      {/* 
        ============================================================
        1. PROGRESS INDICATOR (Step X of 5)
        ============================================================
      */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#DCD6C0] shadow-sm flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl" aria-hidden="true">
              {STEP_CONFIG[currentStep - 1].icon}
            </span>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#235334]">
                Step {currentStep} of 5
              </span>
              <h2 className="text-lg sm:text-xl font-extrabold text-[#1B2D21]">
                {STEP_CONFIG[currentStep - 1].title}
              </h2>
            </div>
          </div>
          <span className="text-xs font-bold text-[#5F6E62] bg-[#EFEAD8] px-3 py-1 rounded-full border border-[#D1CAAD]">
            {Math.round((currentStep / 5) * 100)}% Complete
          </span>
        </div>

        {/* Progress bar track */}
        <div
          className="w-full h-3 bg-[#EFEAD8] rounded-full overflow-hidden border border-[#D1CAAD]"
          role="progressbar"
          aria-valuenow={currentStep}
          aria-valuemin={1}
          aria-valuemax={5}
        >
          <div
            className="h-full bg-[#235334] rounded-full transition-all duration-300"
            style={{ width: `${(currentStep / 5) * 100}%` }}
          />
        </div>

        {/* Multi-step mini badges */}
        <div className="grid grid-cols-5 gap-1.5 pt-1">
          {STEP_CONFIG.map((s) => {
            const isCompleted = s.step < currentStep;
            const isCurrent = s.step === currentStep;

            return (
              <button
                key={s.step}
                type="button"
                onClick={() => {
                  // Allow jumping to already completed steps
                  if (s.step < currentStep) {
                    setErrorMessage(null);
                    setCurrentStep(s.step);
                  }
                }}
                className={`py-1.5 px-1 rounded-xl text-center text-[11px] sm:text-xs font-bold flex flex-col items-center justify-center gap-0.5 border transition-all ${
                  isCurrent
                    ? "bg-[#235334] text-[#FAF7EE] border-[#235334]"
                    : isCompleted
                    ? "bg-[#EAF5EB] text-[#2E7D32] border-[#A3D9A5] hover:bg-[#d8eedb] cursor-pointer"
                    : "bg-[#FAF7EE] text-[#5F6E62] border-[#DCD6C0]"
                }`}
              >
                <span>{isCompleted ? "✓" : s.icon}</span>
                <span className="truncate max-w-full">{s.title.split(" ")[0]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Error banner (Icon + Word + Color) */}
      {errorMessage && (
        <div
          role="alert"
          className="p-4 rounded-2xl bg-[#FDF2F2] border-2 border-[#FCA5A5] text-[#C53030] flex items-start gap-3 shadow-sm"
        >
          <span className="text-2xl" aria-hidden="true">⚠️</span>
          <div>
            <p className="font-extrabold text-sm sm:text-base">Please check this step:</p>
            <p className="text-xs sm:text-sm font-medium mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* 
        ============================================================
        SCREEN 1: FIELD BASICS (SRS Section 4.4)
        ============================================================
      */}
      {currentStep === 1 && (
        <div className="bg-white rounded-3xl p-5 sm:p-7 border border-[#DCD6C0] shadow-sm flex flex-col gap-6">
          <div className="border-b border-[#EFEAD8] pb-3">
            <h3 className="text-lg sm:text-xl font-extrabold text-[#1B2D21]">
              Field Basics
            </h3>
            <p className="text-xs sm:text-sm text-[#5F6E62]">
              Provide identity, location, and land area details for your new field.
            </p>
          </div>

          {/* 1. Field ID */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-extrabold text-[#1B2D21] flex items-center gap-2">
                <span>🏷️</span>
                <span>Field ID</span>
              </label>
              <span className="text-xs font-bold text-[#5F6E62] bg-[#EFEAD8] px-2.5 py-0.5 rounded-full border border-[#D1CAAD]">
                🔒 Auto-generated
              </span>
            </div>
            <div className="min-h-[56px] px-4 py-3 rounded-2xl bg-[#F4F1E6] border border-[#DCD6C0] text-[#1B2D21] font-mono font-bold flex items-center justify-between">
              <span>{formData.id}</span>
              <span className="text-xs font-sans font-medium text-[#5F6E62]">
                Not editable
              </span>
            </div>
          </div>

          {/* 2. Field Nickname (Optional) */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="nickname-input"
                className="text-sm font-extrabold text-[#1B2D21] flex items-center gap-2"
              >
                <span>🏷️</span>
                <span>Field Nickname</span>
              </label>
              <span className="text-xs text-[#5F6E62] font-semibold">Optional</span>
            </div>
            <input
              id="nickname-input"
              type="text"
              value={formData.nickname}
              onChange={(e) => updateField("nickname", e.target.value)}
              placeholder="e.g. North plot near borewell"
              className="min-h-[56px] px-4 py-3 rounded-2xl border border-[#DCD6C0] bg-white text-base text-[#1B2D21] placeholder-[#8F9E92] focus:outline-none focus:ring-2 focus:ring-[#235334] transition-all"
            />
          </div>

          {/* 3. Field Location (Required) */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-extrabold text-[#1B2D21] flex items-center gap-2">
                <span>📍</span>
                <span>Field Location</span>
              </label>
              <span className="text-xs font-bold text-[#C53030] bg-[#FDF2F2] px-2 py-0.5 rounded-full border border-[#FCA5A5]">
                * Required
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
              <button
                type="button"
                onClick={() =>
                  updateField("location", "Current GPS (13.0827° N, 77.5877° E)")
                }
                className={`min-h-[56px] p-4 rounded-2xl border-2 flex flex-col items-start justify-center text-left transition-all cursor-pointer ${
                  formData.location.includes("GPS")
                    ? "border-[#235334] bg-[#EAF5EB] shadow-sm"
                    : "border-[#DCD6C0] bg-white hover:bg-[#FAF7EE]"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl" aria-hidden="true">📍</span>
                    <span className="font-extrabold text-sm sm:text-base text-[#1B2D21]">
                      Use My GPS
                    </span>
                  </div>
                  {formData.location.includes("GPS") && (
                    <span className="text-xs font-bold text-[#2E7D32] bg-white px-2 py-0.5 rounded-full border border-[#A3D9A5]">
                      ✓ Selected
                    </span>
                  )}
                </div>
                <span className="text-xs text-[#5F6E62] mt-1">
                  Automatic GPS coordinates
                </span>
              </button>

              <button
                type="button"
                onClick={() =>
                  updateField("location", "Map Pin (Plot #12, North Gate)")
                }
                className={`min-h-[56px] p-4 rounded-2xl border-2 flex flex-col items-start justify-center text-left transition-all cursor-pointer ${
                  formData.location.includes("Map")
                    ? "border-[#235334] bg-[#EAF5EB] shadow-sm"
                    : "border-[#DCD6C0] bg-white hover:bg-[#FAF7EE]"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl" aria-hidden="true">🗺️</span>
                    <span className="font-extrabold text-sm sm:text-base text-[#1B2D21]">
                      Pick on Map
                    </span>
                  </div>
                  {formData.location.includes("Map") && (
                    <span className="text-xs font-bold text-[#2E7D32] bg-white px-2 py-0.5 rounded-full border border-[#A3D9A5]">
                      ✓ Selected
                    </span>
                  )}
                </div>
                <span className="text-xs text-[#5F6E62] mt-1">
                  Tap to place pin on map
                </span>
              </button>
            </div>

            {formData.location && (
              <div className="mt-2 p-3 rounded-2xl bg-[#EAF5EB] border border-[#A3D9A5] flex items-center justify-between text-xs sm:text-sm">
                <span className="font-bold text-[#235334]">
                  📌 Recorded: {formData.location}
                </span>
                <button
                  type="button"
                  onClick={() => updateField("location", "")}
                  className="text-xs font-bold text-[#5F6E62] underline hover:text-[#1B2D21] ml-2"
                >
                  Change
                </button>
              </div>
            )}
          </div>

          {/* 4. Field Area (Required) */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="area-input"
                className="text-sm font-extrabold text-[#1B2D21] flex items-center gap-2"
              >
                <span>📐</span>
                <span>Field Area Size</span>
              </label>
              <span className="text-xs font-bold text-[#C53030] bg-[#FDF2F2] px-2 py-0.5 rounded-full border border-[#FCA5A5]">
                * Required
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mt-1">
              <div className="flex-1">
                <input
                  id="area-input"
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={formData.areaSize}
                  onChange={(e) =>
                    updateField(
                      "areaSize",
                      e.target.value === "" ? "" : Number(e.target.value)
                    )
                  }
                  placeholder="e.g. 2.5"
                  className="w-full min-h-[56px] px-4 py-3 rounded-2xl border border-[#DCD6C0] bg-white text-base sm:text-lg font-bold text-[#1B2D21] placeholder-[#8F9E92] focus:outline-none focus:ring-2 focus:ring-[#235334] transition-all"
                />
              </div>

              <div className="flex gap-2">
                {areaUnitOptions.map((opt) => {
                  const isSelected = formData.areaUnit === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() =>
                        updateField("areaUnit", opt.id as "acres" | "guntas")
                      }
                      className={`min-h-[56px] px-4 py-2 rounded-2xl border-2 flex items-center gap-2 font-bold text-sm sm:text-base transition-all cursor-pointer ${
                        isSelected
                          ? "border-[#235334] bg-[#EAF5EB] text-[#235334] shadow-sm"
                          : "border-[#DCD6C0] bg-white text-[#5F6E62] hover:bg-[#FAF7EE]"
                      }`}
                    >
                      <span className="text-xl" aria-hidden="true">{opt.icon}</span>
                      <span>{opt.label}</span>
                      {isSelected && (
                        <span className="text-xs text-[#2E7D32]">✓</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 
        ============================================================
        SCREEN 2: CROP (SRS Section 4.4)
        ============================================================
      */}
      {currentStep === 2 && (
        <div className="bg-white rounded-3xl p-5 sm:p-7 border border-[#DCD6C0] shadow-sm flex flex-col gap-6">
          <div className="border-b border-[#EFEAD8] pb-3">
            <h3 className="text-lg sm:text-xl font-extrabold text-[#1B2D21]">
              Crop Selection
            </h3>
            <p className="text-xs sm:text-sm text-[#5F6E62]">
              Select the primary crop and specify the sowing date to calculate water requirements.
            </p>
          </div>

          {/* 1. Crop Name Options Cards */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-extrabold text-[#1B2D21] flex items-center gap-2">
                <span>🌾</span>
                <span>Select Crop</span>
              </label>
              <span className="text-xs font-bold text-[#C53030] bg-[#FDF2F2] px-2 py-0.5 rounded-full border border-[#FCA5A5]">
                * Required
              </span>
            </div>
            <p className="text-xs text-[#5F6E62]">
              Choose from common regional crops:
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 mt-1">
              {cropOptions.map((crop) => {
                const isSelected = formData.cropName === crop.label;
                return (
                  <button
                    key={crop.id}
                    type="button"
                    onClick={() => updateField("cropName", crop.label)}
                    className={`min-h-[72px] p-3 rounded-2xl border-2 flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
                      isSelected
                        ? "border-[#235334] bg-[#EAF5EB] shadow-sm scale-[1.02]"
                        : "border-[#DCD6C0] bg-white hover:bg-[#FAF7EE]"
                    }`}
                  >
                    <span className="text-2xl" aria-hidden="true">{crop.icon}</span>
                    <span className="font-extrabold text-xs sm:text-sm text-[#1B2D21] mt-1">
                      {crop.label}
                    </span>
                    {isSelected && (
                      <span className="text-[10px] font-bold text-[#2E7D32] bg-white px-2 py-0.5 rounded-full border border-[#A3D9A5] mt-1">
                        ✓ Selected
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Sowing Date Picker & "Not Sown Yet" Toggle */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <label
                htmlFor="sowing-date"
                className="text-sm font-extrabold text-[#1B2D21] flex items-center gap-2"
              >
                <span>📅</span>
                <span>Sowing Date</span>
              </label>
              <span className="text-xs font-bold text-[#C53030] bg-[#FDF2F2] px-2 py-0.5 rounded-full border border-[#FCA5A5]">
                * Required
              </span>
            </div>
            <p className="text-xs text-[#5F6E62]">
              Provide an approximate date or indicate if the crop is not sown yet:
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              {/* Date Input */}
              <div className="flex-1">
                <input
                  id="sowing-date"
                  type="date"
                  disabled={formData.notSownYet}
                  value={formData.sowingDate}
                  onChange={(e) => {
                    updateField("sowingDate", e.target.value);
                    if (formData.notSownYet) {
                      updateField("notSownYet", false);
                    }
                  }}
                  className={`w-full min-h-[56px] px-4 py-3 rounded-2xl border text-base font-bold transition-all ${
                    formData.notSownYet
                      ? "bg-[#F4F1E6] border-[#DCD6C0] text-[#8F9E92] cursor-not-allowed"
                      : "bg-white border-[#DCD6C0] text-[#1B2D21] focus:ring-2 focus:ring-[#235334]"
                  }`}
                />
              </div>

              {/* "Not sown yet" option button */}
              <button
                type="button"
                onClick={() => {
                  const nextState = !formData.notSownYet;
                  updateField("notSownYet", nextState);
                  if (nextState) {
                    updateField("sowingDate", "");
                  }
                }}
                className={`min-h-[56px] px-5 py-3 rounded-2xl border-2 flex items-center justify-center gap-2 font-bold text-sm sm:text-base transition-all cursor-pointer ${
                  formData.notSownYet
                    ? "border-[#235334] bg-[#EAF5EB] text-[#235334] shadow-sm"
                    : "border-[#DCD6C0] bg-white text-[#5F6E62] hover:bg-[#FAF7EE]"
                }`}
              >
                <span className="text-xl" aria-hidden="true">🌱</span>
                <span>Not sown yet</span>
                {formData.notSownYet && (
                  <span className="text-xs text-[#2E7D32]">✓</span>
                )}
              </button>
            </div>

            {/* Calculated stage hint */}
            {(formData.sowingDate || formData.notSownYet) && (
              <div className="p-3 rounded-2xl bg-[#EAF5EB] border border-[#A3D9A5] flex items-center gap-2 text-xs sm:text-sm text-[#235334]">
                <span>📈</span>
                <span>
                  <strong>Calculated Stage:</strong>{" "}
                  {calculateGrowthStage(formData.sowingDate, formData.notSownYet)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 
        ============================================================
        SCREEN 3: SOIL AND WATER (SRS Section 4.4)
        ============================================================
      */}
      {currentStep === 3 && (
        <div className="bg-white rounded-3xl p-5 sm:p-7 border border-[#DCD6C0] shadow-sm flex flex-col gap-6">
          <div className="border-b border-[#EFEAD8] pb-3">
            <h3 className="text-lg sm:text-xl font-extrabold text-[#1B2D21]">
              Soil & Water Characteristics
            </h3>
            <p className="text-xs sm:text-sm text-[#5F6E62]">
              Helps Riego determine water retention, infiltration rate, and irrigation duration.
            </p>
          </div>

          {/* 1. Soil Type Cards */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-extrabold text-[#1B2D21] flex items-center gap-2">
                <span>🏖️</span>
                <span>Soil Type</span>
              </label>
              <span className="text-xs font-bold text-[#C53030] bg-[#FDF2F2] px-2 py-0.5 rounded-full border border-[#FCA5A5]">
                * Required
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-1">
              {soilTypeOptions.map((soil) => {
                const isSelected = formData.soilType === soil.label;
                return (
                  <button
                    key={soil.id}
                    type="button"
                    onClick={() => updateField("soilType", soil.label)}
                    className={`min-h-[76px] p-3.5 rounded-2xl border-2 flex flex-col items-start justify-center text-left transition-all cursor-pointer ${
                      isSelected
                        ? "border-[#235334] bg-[#EAF5EB] shadow-sm"
                        : "border-[#DCD6C0] bg-white hover:bg-[#FAF7EE]"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <span className="text-xl" aria-hidden="true">{soil.icon}</span>
                        <span className="font-extrabold text-sm sm:text-base text-[#1B2D21]">
                          {soil.label}
                        </span>
                      </div>
                      {isSelected && (
                        <span className="text-xs font-bold text-[#2E7D32] bg-white px-1.5 py-0.2 rounded-full border border-[#A3D9A5]">
                          ✓
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-[#5F6E62] mt-1 leading-snug">
                      {soil.hint}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Water Source Cards */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-extrabold text-[#1B2D21] flex items-center gap-2">
                <span>🚰</span>
                <span>Water Source</span>
              </label>
              <span className="text-xs font-bold text-[#C53030] bg-[#FDF2F2] px-2 py-0.5 rounded-full border border-[#FCA5A5]">
                * Required
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
              {waterSourceOptions.map((src) => {
                const isSelected = formData.waterSource === src.label;
                return (
                  <button
                    key={src.id}
                    type="button"
                    onClick={() => updateField("waterSource", src.label)}
                    className={`min-h-[76px] p-3.5 rounded-2xl border-2 flex flex-col items-start justify-center text-left transition-all cursor-pointer ${
                      isSelected
                        ? "border-[#235334] bg-[#EAF5EB] shadow-sm"
                        : "border-[#DCD6C0] bg-white hover:bg-[#FAF7EE]"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <span className="text-xl" aria-hidden="true">{src.icon}</span>
                        <span className="font-extrabold text-sm sm:text-base text-[#1B2D21]">
                          {src.label}
                        </span>
                      </div>
                      {isSelected && (
                        <span className="text-xs font-bold text-[#2E7D32] bg-white px-1.5 py-0.2 rounded-full border border-[#A3D9A5]">
                          ✓
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-[#5F6E62] mt-1 leading-snug">
                      {src.hint}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Irrigation Method Cards */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-extrabold text-[#1B2D21] flex items-center gap-2">
                <span>🚿</span>
                <span>Irrigation Method</span>
              </label>
              <span className="text-xs font-bold text-[#C53030] bg-[#FDF2F2] px-2 py-0.5 rounded-full border border-[#FCA5A5]">
                * Required
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-1">
              {irrigationMethodOptions.map((method) => {
                const isSelected = formData.irrigationMethod === method.label;
                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => updateField("irrigationMethod", method.label)}
                    className={`min-h-[76px] p-3.5 rounded-2xl border-2 flex flex-col items-start justify-center text-left transition-all cursor-pointer ${
                      isSelected
                        ? "border-[#235334] bg-[#EAF5EB] shadow-sm"
                        : "border-[#DCD6C0] bg-white hover:bg-[#FAF7EE]"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <span className="text-xl" aria-hidden="true">{method.icon}</span>
                        <span className="font-extrabold text-sm sm:text-base text-[#1B2D21]">
                          {method.label}
                        </span>
                      </div>
                      {isSelected && (
                        <span className="text-xs font-bold text-[#2E7D32] bg-white px-1.5 py-0.2 rounded-full border border-[#A3D9A5]">
                          ✓
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-[#5F6E62] mt-1 leading-snug">
                      {method.hint}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Pump Flow Rate (Optional with "I don't know" button) */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="flowrate-input"
                className="text-sm font-extrabold text-[#1B2D21] flex items-center gap-2"
              >
                <span>⚡</span>
                <span>Pump Flow Rate (Optional)</span>
              </label>
              <span className="text-xs text-[#5F6E62] font-semibold">Optional</span>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <input
                id="flowrate-input"
                type="number"
                disabled={formData.pumpFlowRateUnknown}
                value={formData.pumpFlowRate}
                onChange={(e) => {
                  updateField(
                    "pumpFlowRate",
                    e.target.value === "" ? "" : Number(e.target.value)
                  )
                }}
                placeholder="e.g. 50 (Litres/min or HP)"
                className={`flex-1 min-h-[56px] px-4 py-3 rounded-2xl border text-base font-bold transition-all ${
                  formData.pumpFlowRateUnknown
                    ? "bg-[#F4F1E6] border-[#DCD6C0] text-[#8F9E92] cursor-not-allowed"
                    : "bg-white border-[#DCD6C0] text-[#1B2D21] focus:ring-2 focus:ring-[#235334]"
                }`}
              />

              <button
                type="button"
                onClick={() => {
                  const nextUnknown = !formData.pumpFlowRateUnknown;
                  updateField("pumpFlowRateUnknown", nextUnknown);
                  if (nextUnknown) {
                    updateField("pumpFlowRate", "");
                  }
                }}
                className={`min-h-[56px] px-5 py-3 rounded-2xl border-2 flex items-center justify-center gap-2 font-bold text-sm sm:text-base transition-all cursor-pointer ${
                  formData.pumpFlowRateUnknown
                    ? "border-[#235334] bg-[#EAF5EB] text-[#235334] shadow-sm"
                    : "border-[#DCD6C0] bg-white text-[#5F6E62] hover:bg-[#FAF7EE]"
                }`}
              >
                <span className="text-xl" aria-hidden="true">🤷‍♂️</span>
                <span>I don&apos;t know</span>
                {formData.pumpFlowRateUnknown && (
                  <span className="text-xs text-[#2E7D32]">✓</span>
                )}
              </button>
            </div>
            <p className="text-xs text-[#5F6E62]">
              If unknown, Riego will estimate pump time using regional averages.
            </p>
          </div>
        </div>
      )}

      {/* 
        ============================================================
        SCREEN 4: SENSOR DEVICE (SRS Section 4.4)
        ============================================================
      */}
      {currentStep === 4 && (
        <div className="bg-white rounded-3xl p-5 sm:p-7 border border-[#DCD6C0] shadow-sm flex flex-col gap-6">
          <div className="border-b border-[#EFEAD8] pb-3">
            <h3 className="text-lg sm:text-xl font-extrabold text-[#1B2D21]">
              Sensor Device Setup
            </h3>
            <p className="text-xs sm:text-sm text-[#5F6E62]">
              Link an IoT soil moisture sensor node, or register now and add the device later.
            </p>
          </div>

          {/* 1. Has sensor toggle cards */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-extrabold text-[#1B2D21] flex items-center gap-2">
                <span>📡</span>
                <span>Sensor device installed?</span>
              </label>
              <span className="text-xs font-bold text-[#C53030] bg-[#FDF2F2] px-2 py-0.5 rounded-full border border-[#FCA5A5]">
                * Required
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
              {/* Option A: Yes */}
              <button
                type="button"
                onClick={() => updateField("hasSensor", true)}
                className={`min-h-[72px] p-4 rounded-2xl border-2 flex flex-col items-start justify-center text-left transition-all cursor-pointer ${
                  formData.hasSensor === true
                    ? "border-[#235334] bg-[#EAF5EB] shadow-sm"
                    : "border-[#DCD6C0] bg-white hover:bg-[#FAF7EE]"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl" aria-hidden="true">📡</span>
                    <span className="font-extrabold text-sm sm:text-base text-[#1B2D21]">
                      Yes, installed
                    </span>
                  </div>
                  {formData.hasSensor === true && (
                    <span className="text-xs font-bold text-[#2E7D32] bg-white px-2 py-0.5 rounded-full border border-[#A3D9A5]">
                      ✓ Selected
                    </span>
                  )}
                </div>
                <span className="text-xs text-[#5F6E62] mt-1">
                  I have a sensor node in this field
                </span>
              </button>

              {/* Option B: Not yet */}
              <button
                type="button"
                onClick={() => {
                  updateField("hasSensor", false);
                  updateField("deviceId", "");
                }}
                className={`min-h-[72px] p-4 rounded-2xl border-2 flex flex-col items-start justify-center text-left transition-all cursor-pointer ${
                  formData.hasSensor === false
                    ? "border-[#235334] bg-[#EAF5EB] shadow-sm"
                    : "border-[#DCD6C0] bg-white hover:bg-[#FAF7EE]"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl" aria-hidden="true">⏳</span>
                    <span className="font-extrabold text-sm sm:text-base text-[#1B2D21]">
                      Not yet
                    </span>
                  </div>
                  {formData.hasSensor === false && (
                    <span className="text-xs font-bold text-[#2E7D32] bg-white px-2 py-0.5 rounded-full border border-[#A3D9A5]">
                      ✓ Selected
                    </span>
                  )}
                </div>
                <span className="text-xs text-[#5F6E62] mt-1">
                  Save now, attach sensor later
                </span>
              </button>
            </div>
          </div>

          {/* Conditional: If YES -> Show Device ID & Visual QR scan */}
          {formData.hasSensor === true && (
            <div className="flex flex-col gap-3 p-4 sm:p-5 rounded-2xl bg-[#FAF7EE] border border-[#D1CAAD]">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="device-id-input"
                  className="text-sm font-extrabold text-[#1B2D21] flex items-center gap-2"
                >
                  <span>🆔</span>
                  <span>Device ID / Serial Number</span>
                </label>
                <span className="text-xs font-bold text-[#C53030] bg-[#FDF2F2] px-2 py-0.5 rounded-full border border-[#FCA5A5]">
                  * Required
                </span>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  id="device-id-input"
                  type="text"
                  value={formData.deviceId}
                  onChange={(e) => updateField("deviceId", e.target.value)}
                  placeholder="e.g. SN-8842-A"
                  className="flex-1 min-h-[56px] px-4 py-3 rounded-2xl border border-[#DCD6C0] bg-white text-base font-bold text-[#1B2D21] placeholder-[#8F9E92] focus:ring-2 focus:ring-[#235334]"
                />

                {/* Visual-only QR Scanner Button */}
                <button
                  type="button"
                  onClick={() => updateField("deviceId", "SN-QR-9182")}
                  className="min-h-[56px] px-5 py-3 rounded-2xl border-2 border-[#235334] bg-white text-[#235334] hover:bg-[#EAF5EB] font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <span className="text-xl" aria-hidden="true">📷</span>
                  <span>Scan QR Code</span>
                </button>
              </div>
              <p className="text-xs text-[#5F6E62]">
                Enter the serial printed on the sensor box, or tap &quot;Scan QR Code&quot; (visual simulation).
              </p>
            </div>
          )}

          {/* Conditional: If NOT YET -> Show friendly note */}
          {formData.hasSensor === false && (
            <div className="p-4 rounded-2xl bg-[#EAF5EB] border border-[#A3D9A5] flex items-start gap-3">
              <span className="text-2xl" aria-hidden="true">💡</span>
              <div className="text-xs sm:text-sm text-[#235334]">
                <strong className="block font-bold">You can add the device later.</strong>
                <p className="mt-0.5 text-[#5F6E62]">
                  Your field will be saved and you will still receive daily weather forecasts
                  and crop recommendations based on regional soil modeling.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 
        ============================================================
        SCREEN 5: REVIEW AND SAVE (SRS Section 4.4)
        ============================================================
      */}
      {currentStep === 5 && (
        <div className="bg-white rounded-3xl p-5 sm:p-7 border border-[#DCD6C0] shadow-sm flex flex-col gap-6">
          <div className="border-b border-[#EFEAD8] pb-3">
            <h3 className="text-lg sm:text-xl font-extrabold text-[#1B2D21]">
              Review & Save Field
            </h3>
            <p className="text-xs sm:text-sm text-[#5F6E62]">
              Please check all field details before saving. You can edit any group below.
            </p>
          </div>

          {/* Automatic metadata card */}
          <div className="p-4 rounded-2xl bg-[#EFEAD8] border border-[#D1CAAD] flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm">
            <span className="font-bold text-[#1B2D21] flex items-center gap-1.5">
              <span>👤</span> Farmer ID: <span className="font-mono">{formData.farmerId}</span>
            </span>
            <span className="font-bold text-[#5F6E62] flex items-center gap-1.5">
              <span>📅</span> Date: {new Date().toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
            </span>
            <span className="font-bold text-[#235334] flex items-center gap-1.5">
              <span>📈</span> Stage: {calculateGrowthStage(formData.sowingDate, formData.notSownYet)}
            </span>
          </div>

          {/* 1. Group: Field Basics */}
          <div className="p-4 sm:p-5 rounded-2xl border border-[#DCD6C0] bg-[#FAF7EE] flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-[#EFEAD8] pb-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">📍</span>
                <h4 className="font-extrabold text-base text-[#1B2D21]">
                  1. Field Basics
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="text-xs font-bold text-[#235334] bg-white px-3 py-1.5 rounded-xl border border-[#A3D9A5] hover:bg-[#EAF5EB] flex items-center gap-1 cursor-pointer transition-all"
              >
                <span>✏️</span>
                <span>Edit</span>
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm">
              <div>
                <span className="text-[#5F6E62]">Field ID:</span>{" "}
                <strong className="text-[#1B2D21] font-mono">{formData.id}</strong>
              </div>
              <div>
                <span className="text-[#5F6E62]">Nickname:</span>{" "}
                <strong className="text-[#1B2D21]">
                  {formData.nickname.trim() || "None"}
                </strong>
              </div>
              <div>
                <span className="text-[#5F6E62]">Location:</span>{" "}
                <strong className="text-[#1B2D21]">{formData.location}</strong>
              </div>
              <div>
                <span className="text-[#5F6E62]">Area Size:</span>{" "}
                <strong className="text-[#1B2D21]">
                  {formData.areaSize} {formData.areaUnit}
                </strong>
              </div>
            </div>
          </div>

          {/* 2. Group: Crop */}
          <div className="p-4 sm:p-5 rounded-2xl border border-[#DCD6C0] bg-[#FAF7EE] flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-[#EFEAD8] pb-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">🌾</span>
                <h4 className="font-extrabold text-base text-[#1B2D21]">
                  2. Crop Details
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="text-xs font-bold text-[#235334] bg-white px-3 py-1.5 rounded-xl border border-[#A3D9A5] hover:bg-[#EAF5EB] flex items-center gap-1 cursor-pointer transition-all"
              >
                <span>✏️</span>
                <span>Edit</span>
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm">
              <div>
                <span className="text-[#5F6E62]">Crop Name:</span>{" "}
                <strong className="text-[#1B2D21]">{formData.cropName}</strong>
              </div>
              <div>
                <span className="text-[#5F6E62]">Sowing Date:</span>{" "}
                <strong className="text-[#1B2D21]">
                  {formData.notSownYet ? "Not sown yet" : formData.sowingDate}
                </strong>
              </div>
              <div className="sm:col-span-2">
                <span className="text-[#5F6E62]">Calculated Stage:</span>{" "}
                <strong className="text-[#235334]">
                  {calculateGrowthStage(formData.sowingDate, formData.notSownYet)}
                </strong>
              </div>
            </div>
          </div>

          {/* 3. Group: Soil & Water */}
          <div className="p-4 sm:p-5 rounded-2xl border border-[#DCD6C0] bg-[#FAF7EE] flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-[#EFEAD8] pb-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">🌱</span>
                <h4 className="font-extrabold text-base text-[#1B2D21]">
                  3. Soil & Water
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="text-xs font-bold text-[#235334] bg-white px-3 py-1.5 rounded-xl border border-[#A3D9A5] hover:bg-[#EAF5EB] flex items-center gap-1 cursor-pointer transition-all"
              >
                <span>✏️</span>
                <span>Edit</span>
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm">
              <div>
                <span className="text-[#5F6E62]">Soil Type:</span>{" "}
                <strong className="text-[#1B2D21]">{formData.soilType}</strong>
              </div>
              <div>
                <span className="text-[#5F6E62]">Water Source:</span>{" "}
                <strong className="text-[#1B2D21]">{formData.waterSource}</strong>
              </div>
              <div>
                <span className="text-[#5F6E62]">Irrigation Method:</span>{" "}
                <strong className="text-[#1B2D21]">{formData.irrigationMethod}</strong>
              </div>
              <div>
                <span className="text-[#5F6E62]">Pump Flow Rate:</span>{" "}
                <strong className="text-[#1B2D21]">
                  {formData.pumpFlowRateUnknown
                    ? "Unknown (Regional avg used)"
                    : formData.pumpFlowRate ? `${formData.pumpFlowRate} L/min` : "Not specified"}
                </strong>
              </div>
            </div>
          </div>

          {/* 4. Group: Sensor Device */}
          <div className="p-4 sm:p-5 rounded-2xl border border-[#DCD6C0] bg-[#FAF7EE] flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-[#EFEAD8] pb-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">📡</span>
                <h4 className="font-extrabold text-base text-[#1B2D21]">
                  4. Sensor Device
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setCurrentStep(4)}
                className="text-xs font-bold text-[#235334] bg-white px-3 py-1.5 rounded-xl border border-[#A3D9A5] hover:bg-[#EAF5EB] flex items-center gap-1 cursor-pointer transition-all"
              >
                <span>✏️</span>
                <span>Edit</span>
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm">
              <div>
                <span className="text-[#5F6E62]">Device Status:</span>{" "}
                <strong className="text-[#1B2D21]">
                  {formData.hasSensor ? "Installed" : "Not yet (Can add later)"}
                </strong>
              </div>
              <div>
                <span className="text-[#5F6E62]">Device ID:</span>{" "}
                <strong className="text-[#1B2D21] font-mono">
                  {formData.hasSensor ? formData.deviceId : "None"}
                </strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 
        ============================================================
        NAVIGATION BUTTONS (Next / Back / Save)
        - Big tap-friendly buttons (at least 56px tall)
        - Pairs text with icons
        ============================================================
      */}
      <div className="flex items-center justify-between gap-3 pt-2">
        {/* Back / Cancel button */}
        {currentStep === 1 ? (
          <Link
            href="/fields"
            className="min-h-[56px] min-w-[120px] px-5 py-3 rounded-2xl border-2 border-[#DCD6C0] bg-white text-[#5F6E62] hover:bg-[#FAF7EE] font-bold text-base flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
          >
            <span aria-hidden="true">✕</span>
            <span>Cancel</span>
          </Link>
        ) : (
          <button
            type="button"
            onClick={handleBack}
            className="min-h-[56px] min-w-[120px] px-5 py-3 rounded-2xl border-2 border-[#DCD6C0] bg-white text-[#1B2D21] hover:bg-[#FAF7EE] font-bold text-base flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
          >
            <span aria-hidden="true">←</span>
            <span>Back</span>
          </button>
        )}

        {/* Next step or Save Field button */}
        {currentStep < 5 ? (
          <button
            type="button"
            onClick={handleNext}
            className="flex-1 min-h-[56px] px-6 py-3 rounded-2xl bg-[#235334] text-[#FAF7EE] hover:bg-[#1A3E27] font-bold text-base sm:text-lg flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all cursor-pointer"
          >
            <span>Next: {STEP_CONFIG[currentStep].title}</span>
            <span aria-hidden="true">→</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSaveField}
            className="flex-1 min-h-[56px] px-6 py-3 rounded-2xl bg-[#235334] text-[#FAF7EE] hover:bg-[#1A3E27] font-bold text-base sm:text-lg flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all cursor-pointer"
          >
            <span aria-hidden="true">💾</span>
            <span>Save Field</span>
            <span aria-hidden="true">✓</span>
          </button>
        )}
      </div>
    </div>
  );
}
