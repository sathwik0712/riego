"use client";

// Signup flow:
// Screen 1: Farmer details (Name, Phone, Village, Preferred Language) → no backend yet
// Screen 2: OTP → POST /auth/signup → save session → success screen

import { useState, useEffect } from "react";
import Link from "next/link";
import Logo from "@/components/Logo";
import { CheckIcon, AlertIcon } from "@/components/icons";
import OtpInput from "@/components/OtpInput";
import { languageOptions } from "@/lib/sampleData";
import { SignupFormData } from "@/lib/types";
import { signupFarmer, ApiError } from "@/lib/api";
import { saveSession, clearSession } from "@/lib/auth";
import { clearAllFarmerCaches } from "@/lib/cache";

export default function SignupPage() {
  // Step 1 = Details, Step 2 = OTP, then success
  const [step, setStep] = useState<1 | 2>(1);
  const [isSuccess, setIsSuccess] = useState(false);
  const [signedInName, setSignedInName] = useState("");

  // Form fields stored in a single object
  const [formData, setFormData] = useState<SignupFormData>({
    name: "",
    phone: "",
    village: "",
    preferredLanguage: "en",
  });

  // Validation error states for Screen 1
  const [errors, setErrors] = useState<{
    name?: string;
    phone?: string;
    village?: string;
  }>({});

  // OTP state for Screen 2
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const [resendTimer, setResendTimer] = useState(30);
  const [resendFeedback, setResendFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState("");

  // Resend countdown timer for Screen 2
  useEffect(() => {
    if (step !== 2 || isSuccess) return;
    if (resendTimer <= 0) return;
    const interval = setInterval(() => {
      setResendTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [step, resendTimer, isSuccess]);

  // Validation function for Screen 1 inputs
  const validateForm = (): boolean => {
    const newErrors: { name?: string; phone?: string; village?: string } = {};
    const trimmedName = formData.name.trim();
    const trimmedVillage = formData.village.trim();

    if (!trimmedName || trimmedName.length < 2 || trimmedName.length > 60) {
      newErrors.name = "Name must be between 2 and 60 characters";
    }

    if (!/^[6-9]\d{9}$/.test(formData.phone)) {
      newErrors.phone = "Phone must be 10 digits starting with 6, 7, 8 or 9";
    }

    if (!trimmedVillage || trimmedVillage.length < 2 || trimmedVillage.length > 60) {
      newErrors.village = "Village must be between 2 and 60 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handler for Screen 1 submission (move to OTP screen)
  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setGeneralError("");
    setStep(2);
    setResendTimer(30);
    setOtp("");
    setOtpError("");
  };

  // Handler for Screen 2 submission (Verify OTP + create account)
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) return;
    if (otp !== "123456") {
      // Client-side check for the demo OTP before hitting the backend
      setOtpError("That code is not correct. Try again.");
      setOtp("");
      return;
    }

    setSubmitting(true);
    setOtpError("");
    setGeneralError("");

    try {
      const res = await signupFarmer({
        name: formData.name.trim(),
        phone: formData.phone,
        village: formData.village.trim(),
        preferred_language: formData.preferredLanguage,
      });
      // Clear any previous farmer's cached data before saving new session
      clearAllFarmerCaches();
      saveSession(res.token, {
        farmer_id: res.farmer_id,
        name: res.name,
        phone: res.phone,
        village: res.village,
        preferred_language: res.preferred_language,
      });
      setSignedInName(res.name);
      setIsSuccess(true);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          // Phone already registered
          setGeneralError("");
          setOtpError(""); // clear otp error
          setErrors({ phone: "This phone number already has an account." });
          setStep(1); // go back to details screen to show the phone error
        } else if (err.status === 0) {
          setGeneralError("Could not reach the server. Check your internet and try again.");
        } else {
          setGeneralError(err.message || "Something went wrong. Please try again.");
        }
      } else {
        setGeneralError("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Resend OTP handler (demo — just resets the timer)
  const handleResend = () => {
    if (resendTimer > 0) return;
    setResendTimer(30);
    setOtp("");
    setOtpError("");
    setResendFeedback("OTP sent again");
    setTimeout(() => setResendFeedback(""), 3500);
  };

  // Format phone number for readability: "+91 98765 43210"
  const formattedPhone =
    formData.phone.length === 10
      ? `+91 ${formData.phone.slice(0, 5)} ${formData.phone.slice(5)}`
      : `+91 ${formData.phone}`;

  return (
    <div className="w-full max-w-[480px] mx-auto py-4 sm:py-6 flex flex-col gap-5 sm:gap-6">
      {/* Header: Centred Logo above the card, Back link and Step badge in row below */}
      <header className="flex flex-col items-center gap-3 w-full">
        {/* Centred Logo above the card */}
        <Logo size="lg" tone="dark" showName={true} />

        {/* Small row below with Back link and Step badge */}
        <div className="flex items-center justify-between w-full px-1">
          {step === 1 || isSuccess ? (
            <Link
              href="/welcome"
              className="min-h-[56px] min-w-[56px] inline-flex items-center gap-1.5 text-sm sm:text-base font-bold text-[#235334] hover:text-[#1A3E27] py-2 px-1 rounded-xl transition-colors"
            >
              <span aria-hidden="true">←</span>
              <span>Back</span>
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => setStep(1)}
              className="min-h-[56px] min-w-[56px] inline-flex items-center gap-1.5 text-sm sm:text-base font-bold text-[#235334] hover:text-[#1A3E27] py-2 px-1 rounded-xl transition-colors"
            >
              <span aria-hidden="true">←</span>
              <span>Back</span>
            </button>
          )}

          {!isSuccess && (
            <span className="text-xs sm:text-sm font-semibold text-[#5F6E62] bg-[#EFEAD8] px-3.5 py-1.5 rounded-full border border-[#D1CAAD]">
              {step === 1 ? "Step 1 of 2" : "Step 2 of 2"}
            </span>
          )}
        </div>
      </header>

      {/* Main card */}
      <div className="w-full bg-white rounded-3xl p-6 sm:p-8 border border-[#DCD6C0] shadow-sm flex flex-col gap-6">
        {/* ─────────────────────────────────────────────────────────────────
            Screen 1: Farmer details
           ───────────────────────────────────────────────────────────────── */}
        {step === 1 && (
          <form onSubmit={handleSendOtp} noValidate className="flex flex-col gap-5">
            {/* Screen 1 title & subtitle */}
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1B2D21]">
                Create your account
              </h1>
              <p className="text-sm sm:text-base text-[#5F6E62]">
                Tell us a little about you.
              </p>
            </div>

            {/* Field: Full Name */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="name-input" className="text-xs sm:text-sm font-semibold text-[#5F6E62]">
                Full name
              </label>
              <input
                id="name-input"
                type="text"
                required
                maxLength={60}
                placeholder="Your full name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={`min-h-[56px] h-14 px-4 rounded-2xl border text-base text-[#1B2D21] transition-all outline-none ${
                  errors.name
                    ? "border-[#DC2626] bg-[#FEF2F2] focus:ring-2 focus:ring-[#DC2626]/20"
                    : "border-[#DCD6C0] bg-[#FAF7EE] focus:bg-white focus:border-[#235334] focus:ring-2 focus:ring-[#235334]/20"
                }`}
              />
              {errors.name && (
                <p className="text-sm text-[#DC2626] flex items-center gap-1.5 mt-0.5">
                  <AlertIcon className="w-4 h-4 text-[#DC2626] shrink-0" />
                  <span>{errors.name}</span>
                </p>
              )}
            </div>

            {/* Field: Phone Number */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="phone-input" className="text-xs sm:text-sm font-semibold text-[#5F6E62]">
                Phone number
              </label>
              <div className="flex items-center gap-2">
                {/* Fixed +91 prefix box */}
                <div
                  aria-hidden="true"
                  className="min-h-[56px] h-14 px-3.5 sm:px-4 rounded-2xl border border-[#DCD6C0] bg-[#EFEAD8] text-base font-bold text-[#1B2D21] flex items-center justify-center shrink-0 select-none"
                >
                  +91
                </div>
                {/* 10-digit number input */}
                <input
                  id="phone-input"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={10}
                  required
                  placeholder="10-digit mobile number"
                  value={formData.phone}
                  onChange={(e) => {
                    const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 10);
                    setFormData({ ...formData, phone: digitsOnly });
                    if (errors.phone) setErrors({ ...errors, phone: undefined });
                  }}
                  className={`flex-1 min-w-0 min-h-[56px] h-14 px-4 rounded-2xl border text-base text-[#1B2D21] transition-all outline-none ${
                    errors.phone
                      ? "border-[#DC2626] bg-[#FEF2F2] focus:ring-2 focus:ring-[#DC2626]/20"
                      : "border-[#DCD6C0] bg-[#FAF7EE] focus:bg-white focus:border-[#235334] focus:ring-2 focus:ring-[#235334]/20"
                  }`}
                />
              </div>
              {errors.phone && (
                <p className="text-sm text-[#DC2626] flex items-center gap-1.5 mt-0.5">
                  <AlertIcon className="w-4 h-4 text-[#DC2626] shrink-0" />
                  <span>
                    {errors.phone}{" "}
                    {errors.phone.includes("already has an account") && (
                      <Link href="/login" className="font-bold underline hover:text-[#991B1B]">
                        Log in instead.
                      </Link>
                    )}
                  </span>
                </p>
              )}
            </div>

            {/* Field: Village or district */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="village-input" className="text-xs sm:text-sm font-semibold text-[#5F6E62]">
                Village or district
              </label>
              <input
                id="village-input"
                type="text"
                required
                maxLength={60}
                placeholder="Your village or district"
                value={formData.village}
                onChange={(e) => setFormData({ ...formData, village: e.target.value })}
                className={`min-h-[56px] h-14 px-4 rounded-2xl border text-base text-[#1B2D21] transition-all outline-none ${
                  errors.village
                    ? "border-[#DC2626] bg-[#FEF2F2] focus:ring-2 focus:ring-[#DC2626]/20"
                    : "border-[#DCD6C0] bg-[#FAF7EE] focus:bg-white focus:border-[#235334] focus:ring-2 focus:ring-[#235334]/20"
                }`}
              />
              {errors.village && (
                <p className="text-sm text-[#DC2626] flex items-center gap-1.5 mt-0.5">
                  <AlertIcon className="w-4 h-4 text-[#DC2626] shrink-0" />
                  <span>{errors.village}</span>
                </p>
              )}
            </div>

            {/* Field: Preferred Language */}
            <div className="flex flex-col gap-2">
              <label className="text-xs sm:text-sm font-semibold text-[#5F6E62]">
                Preferred language
              </label>
              <div
                className="grid grid-cols-3 gap-2"
                role="radiogroup"
                aria-label="Preferred language"
              >
                {languageOptions.map((lang) => {
                  const isSelected = formData.preferredLanguage === lang.code;
                  return (
                    <button
                      key={lang.code}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      onClick={() => setFormData({ ...formData, preferredLanguage: lang.code })}
                      className={`min-h-[56px] p-2.5 sm:p-3 rounded-2xl border-2 flex items-center justify-between transition-all cursor-pointer text-left ${
                        isSelected
                          ? "border-[#235334] bg-[#EAF5EB] text-[#235334] font-bold shadow-xs"
                          : "border-[#DCD6C0] bg-[#FAF7EE] text-[#1B2D21] font-medium hover:bg-[#EFEAD8]"
                      }`}
                    >
                      <span className="text-sm sm:text-base truncate">{lang.label}</span>
                      {isSelected ? (
                        <div className="w-5 h-5 rounded-full bg-[#235334] text-white flex items-center justify-center shrink-0">
                          <CheckIcon className="w-3 h-3 text-white" />
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-[#D1CAAD] shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Action button: Send OTP (at least 56px tall) */}
            <button
              type="submit"
              className="min-h-[56px] w-full mt-2 py-3.5 rounded-2xl bg-[#235334] hover:bg-[#1A3E27] text-[#FAF7EE] font-bold text-base sm:text-lg shadow-sm active:scale-95 transition-all flex items-center justify-center text-center cursor-pointer"
            >
              Send OTP
            </button>

            {/* Login redirect link */}
            <p className="text-sm text-[#5F6E62] text-center mt-1">
              Already have an account?{" "}
              <Link href="/login" className="font-bold text-[#235334] hover:underline">
                Log in
              </Link>
            </p>
          </form>
        )}

        {/* ─────────────────────────────────────────────────────────────────
            Screen 2: Enter OTP or Success State
           ───────────────────────────────────────────────────────────────── */}
        {step === 2 && !isSuccess && (
          <form onSubmit={handleVerifyOtp} noValidate className="flex flex-col gap-5">
            {/* Screen 2 header */}
            <div className="flex flex-col gap-1.5">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1B2D21]">
                Enter the OTP
              </h1>
              <p className="text-sm sm:text-base text-[#5F6E62]">
                We sent a 6-digit code to {formattedPhone}.
              </p>
            </div>

            {/* Demo mode badge */}
            <div className="self-start">
              <span className="text-xs sm:text-sm font-semibold text-[#5F6E62] bg-[#EFEAD8] px-3 py-1.5 rounded-xl border border-[#D1CAAD] inline-block">
                Demo mode: use 123456
              </span>
            </div>

            {/* General error (e.g. server unreachable) */}
            {generalError && (
              <div className="px-4 py-3 rounded-2xl bg-[#FEF2F2] border border-[#FECACA] flex items-center gap-2">
                <AlertIcon className="w-4 h-4 text-[#DC2626] shrink-0" />
                <span className="text-sm text-[#DC2626]">{generalError}</span>
              </div>
            )}

            {/* 6-digit OTP input component */}
            <div className="py-2 flex flex-col items-center gap-2">
              <OtpInput
                value={otp}
                onChange={(val) => {
                  setOtp(val);
                  if (otpError) setOtpError("");
                }}
                hasError={Boolean(otpError)}
              />
              {otpError && (
                <p className="text-sm text-[#DC2626] flex items-center gap-1.5 mt-1">
                  <AlertIcon className="w-4 h-4 text-[#DC2626] shrink-0" />
                  <span>{otpError}</span>
                </p>
              )}
            </div>

            {/* Action button: Verify (at least 56px tall) */}
            <button
              type="submit"
              disabled={otp.length !== 6 || submitting}
              className={`min-h-[56px] w-full py-3.5 rounded-2xl font-bold text-base sm:text-lg shadow-sm transition-all flex items-center justify-center text-center ${
                otp.length === 6 && !submitting
                  ? "bg-[#235334] hover:bg-[#1A3E27] text-[#FAF7EE] active:scale-95 cursor-pointer"
                  : "bg-[#EFEAD8] text-[#8C9A8F] cursor-not-allowed border border-[#D1CAAD]"
              }`}
            >
              {submitting ? "Creating account…" : "Verify"}
            </button>

            {/* Secondary actions: Change phone number & Resend OTP */}
            <div className="flex flex-col items-center gap-3 mt-1">
              <div className="flex items-center justify-between w-full text-sm">
                <button
                  type="button"
                  onClick={() => {
                    setStep(1);
                    setOtp("");
                    setOtpError("");
                    setGeneralError("");
                  }}
                  className="font-bold text-[#235334] hover:underline py-1"
                >
                  Change phone number
                </button>

                {resendTimer > 0 ? (
                  <span className="text-[#5F6E62] font-medium">
                    Resend in {resendTimer}s
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResend}
                    className="font-bold text-[#235334] hover:underline py-1"
                  >
                    Resend OTP
                  </button>
                )}
              </div>

              {resendFeedback && (
                <span className="text-xs font-semibold text-[#2E7D32] bg-[#EAF5EB] px-3 py-1 rounded-full border border-[#A3D9A5]">
                  {resendFeedback}
                </span>
              )}
            </div>
          </form>
        )}

        {/* ─────────────────────────────────────────────────────────────────
            Success State (within the same card)
           ───────────────────────────────────────────────────────────────── */}
        {step === 2 && isSuccess && (
          <div className="flex flex-col items-center text-center gap-5 py-4">
            {/* Big green circle with check icon */}
            <div className="w-16 h-16 rounded-full bg-[#235334] text-white flex items-center justify-center shadow-md">
              <CheckIcon className="w-8 h-8 text-white" />
            </div>

            <div className="flex flex-col gap-1">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1B2D21]">
                Account created
              </h1>
              <p className="text-base sm:text-lg text-[#5F6E62]">
                Welcome, {signedInName.trim()}
              </p>
            </div>

            {/* Go to my farm button linking to / */}
            <Link
              href="/"
              className="min-h-[56px] w-full mt-2 py-3.5 rounded-2xl bg-[#235334] hover:bg-[#1A3E27] text-[#FAF7EE] font-bold text-base sm:text-lg shadow-sm active:scale-95 transition-all flex items-center justify-center text-center"
            >
              Go to my farm
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
