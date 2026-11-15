"use client";

// Login flow with two sequential screens:
// Screen 1: Enter phone number
// Screen 2: Enter OTP (6-digit input, demo code 123456, resend timer)

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Logo from "@/components/Logo";
import { AlertIcon } from "@/components/icons";
import OtpInput from "@/components/OtpInput";
import { findFarmer, startSession, FarmerSession } from "@/lib/session";

// Fake constant for demo mode
const FAKE_OTP = "123456";

export default function LoginPage() {
  const router = useRouter();

  // Screen 1 = Phone number, Screen 2 = OTP
  const [step, setStep] = useState<1 | 2>(1);

  // Phone state and validation error
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [phoneNotFound, setPhoneNotFound] = useState(false);
  const [foundFarmer, setFoundFarmer] = useState<FarmerSession | null>(null);

  // OTP state, error, countdown and feedback
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const [resendTimer, setResendTimer] = useState(30);
  const [resendFeedback, setResendFeedback] = useState("");

  // Resend countdown timer for Screen 2
  useEffect(() => {
    if (step !== 2) return;
    if (resendTimer <= 0) return;

    const interval = setInterval(() => {
      setResendTimer((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [step, resendTimer]);

  // Validation function for phone input (only triggered on submit)
  const validatePhone = (): boolean => {
    if (!/^[6-9]\d{9}$/.test(phone)) {
      setPhoneNotFound(false);
      setPhoneError("Phone must be 10 digits starting with 6, 7, 8 or 9");
      return false;
    }
    setPhoneError("");
    return true;
  };

  // Handler for Screen 1 submission (Send OTP)
  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatePhone()) return;

    // Check if farmer account exists in session storage or built-in demo
    const farmer = findFarmer(phone);
    if (!farmer) {
      setPhoneNotFound(true);
      setPhoneError("No account found for this number. Sign up first.");
      return;
    }

    setPhoneNotFound(false);
    setFoundFarmer(farmer);

    // Future backend integration:
    // Call POST /auth/request-otp with { phone }

    setStep(2);
    setResendTimer(30);
    setOtp("");
    setOtpError("");
  };

  // Handler for Screen 2 submission (Log in)
  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();

    // Future backend integration:
    // Call POST /auth/verify-otp with { phone, otp }
    if (otp === FAKE_OTP) {
      setOtpError("");
      if (foundFarmer) {
        startSession(foundFarmer);
      }
      // Correct code: navigate straight to "/" without success screen
      router.push("/");
    } else {
      setOtpError("That code is not correct. Try again.");
      setOtp(""); // Clear boxes on incorrect attempt
    }
  };

  // Resend OTP handler
  const handleResend = () => {
    if (resendTimer > 0) return;

    // Future backend integration:
    // Call POST /auth/request-otp with { phone }
    setResendTimer(30);
    setOtp("");
    setOtpError("");
    setResendFeedback("OTP sent again");
    setTimeout(() => setResendFeedback(""), 3500);
  };

  // Format phone number for readability: "+91 98765 43210"
  const formattedPhone =
    phone.length === 10
      ? `+91 ${phone.slice(0, 5)} ${phone.slice(5)}`
      : `+91 ${phone}`;

  return (
    <div className="w-full max-w-[480px] mx-auto py-4 sm:py-6 flex flex-col gap-5 sm:gap-6">
      {/* Header: Centred Logo above the card, Back link in row below */}
      <header className="flex flex-col items-center gap-3 w-full">
        {/* Centred Logo above the card */}
        <Logo size="lg" tone="dark" showName={true} />

        {/* Small row below with Back link (at least 56px touch target) */}
        <div className="flex items-center justify-between w-full px-1">
          {step === 1 ? (
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
              onClick={() => {
                setStep(1);
                setOtp("");
                setOtpError("");
              }}
              className="min-h-[56px] min-w-[56px] inline-flex items-center gap-1.5 text-sm sm:text-base font-bold text-[#235334] hover:text-[#1A3E27] py-2 px-1 rounded-xl transition-colors cursor-pointer"
            >
              <span aria-hidden="true">←</span>
              <span>Back</span>
            </button>
          )}
        </div>
      </header>

      {/* Main card */}
      <div className="w-full bg-white rounded-3xl p-6 sm:p-8 border border-[#DCD6C0] shadow-sm flex flex-col gap-6">
        {/* ─────────────────────────────────────────────────────────────────
            Screen 1: Enter phone number
           ───────────────────────────────────────────────────────────────── */}
        {step === 1 && (
          <form onSubmit={handleSendOtp} noValidate className="flex flex-col gap-5">
            {/* Screen 1 title & subtitle */}
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1B2D21]">
                Welcome back
              </h1>
              <p className="text-sm sm:text-base text-[#5F6E62]">
                Enter your phone number to log in.
              </p>
            </div>

            {/* Field: Phone Number */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="login-phone-input" className="text-xs sm:text-sm font-semibold text-[#5F6E62]">
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
                  id="login-phone-input"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={10}
                  required
                  placeholder="10-digit mobile number"
                  value={phone}
                  onChange={(e) => {
                    const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 10);
                    setPhone(digitsOnly);
                    if (phoneError) setPhoneError("");
                    if (phoneNotFound) setPhoneNotFound(false);
                  }}
                  className={`flex-1 min-w-0 min-h-[56px] h-14 px-4 rounded-2xl border text-base text-[#1B2D21] transition-all outline-none ${
                    phoneError
                      ? "border-[#DC2626] bg-[#FEF2F2] focus:ring-2 focus:ring-[#DC2626]/20"
                      : "border-[#DCD6C0] bg-[#FAF7EE] focus:bg-white focus:border-[#235334] focus:ring-2 focus:ring-[#235334]/20"
                  }`}
                />
              </div>
              {phoneError && (
                <div className="text-sm text-[#DC2626] flex items-center gap-1.5 mt-0.5">
                  <AlertIcon className="w-4 h-4 text-[#DC2626] shrink-0" />
                  {phoneNotFound ? (
                    <span>
                      No account found for this number.{" "}
                      <Link href="/signup" className="font-bold underline hover:text-[#991B1B]">
                        Sign up first.
                      </Link>
                    </span>
                  ) : (
                    <span>{phoneError}</span>
                  )}
                </div>
              )}
            </div>

            {/* Action button: Send OTP (at least 56px tall) */}
            <button
              type="submit"
              className="min-h-[56px] w-full mt-2 py-3.5 rounded-2xl bg-[#235334] hover:bg-[#1A3E27] text-[#FAF7EE] font-bold text-base sm:text-lg shadow-sm active:scale-95 transition-all flex items-center justify-center text-center cursor-pointer"
            >
              Send OTP
            </button>

            {/* Signup redirect link */}
            <p className="text-sm text-[#5F6E62] text-center mt-1">
              New here?{" "}
              <Link href="/signup" className="font-bold text-[#235334] hover:underline">
                Sign up
              </Link>
            </p>
          </form>
        )}

        {/* ─────────────────────────────────────────────────────────────────
            Screen 2: Enter OTP
           ───────────────────────────────────────────────────────────────── */}
        {step === 2 && (
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

            {/* Action button: Log in (at least 56px tall) */}
            <button
              type="submit"
              disabled={otp.length !== 6}
              className={`min-h-[56px] w-full py-3.5 rounded-2xl font-bold text-base sm:text-lg shadow-sm transition-all flex items-center justify-center text-center ${
                otp.length === 6
                  ? "bg-[#235334] hover:bg-[#1A3E27] text-[#FAF7EE] active:scale-95 cursor-pointer"
                  : "bg-[#EFEAD8] text-[#8C9A8F] cursor-not-allowed border border-[#D1CAAD]"
              }`}
            >
              Log in
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
                  }}
                  className="font-bold text-[#235334] hover:underline py-1 cursor-pointer"
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
                    className="font-bold text-[#235334] hover:underline py-1 cursor-pointer"
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
      </div>
    </div>
  );
}
