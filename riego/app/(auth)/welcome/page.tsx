"use client";

// Welcome / landing page for Riego
// Full-screen photo background with high-contrast dark green gradient overlay and glass UI

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import Logo from "@/components/Logo";
import { DropIcon, CloudRainIcon, SpeakerIcon } from "@/components/icons";

// Supported languages for the visual glass switcher
const LANGUAGES = [
  { code: "en", label: "EN" },
  { code: "hi", label: "हिं" },
  { code: "kn", label: "ಕ" },
];

// Core benefits highlight rows
const BENEFITS = [
  {
    Icon: DropIcon,
    title: "Know when to water",
    description: "Clear advice for each field",
  },
  {
    Icon: CloudRainIcon,
    title: "Use the weather",
    description: "Rain and heat are checked for you",
  },
  {
    Icon: SpeakerIcon,
    title: "Hear it aloud",
    description: "Listen in Hindi, Kannada or English",
  },
];

export default function WelcomePage() {
  const [activeLang, setActiveLang] = useState("en");

  return (
    <div className="relative min-h-screen w-full overflow-hidden flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      {/* 1. Full-screen background photo */}
      <Image
        src="/welcome-field.jpeg"
        alt="Irrigation sprinkler watering a green field at sunset"
        fill
        priority
        className="object-cover"
        style={{ objectPosition: "30% center" }}
        sizes="100vw"
      />

      {/* 2. Dark green gradient overlay (~85% opacity at left/bottom to ~45% at top-right) */}
      <div
        className="absolute inset-0 bg-gradient-to-tr from-[#0F2215]/85 via-[#152D1C]/75 to-[#1A3823]/45 pointer-events-none"
        aria-hidden="true"
      />

      {/* 3. Content layer positioned above background and overlay */}
      <div className="relative z-10 w-full max-w-[1100px] mx-auto min-h-full flex-1 flex flex-col justify-between gap-6 sm:gap-8">
        {/* Top row: Logo & glass language switcher */}
        <header className="w-full flex items-center justify-between gap-4 py-2 shrink-0">
          <Logo size="md" tone="light" showName={true} />

          {/* Glass language switcher pill */}
          <div
            className="flex items-center h-11 bg-white/15 backdrop-blur-md border border-white/25 rounded-xl p-1 shadow-sm"
            role="group"
            aria-label="Language selection"
          >
            {LANGUAGES.map((lang) => {
              const isActive = activeLang === lang.code;
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => setActiveLang(lang.code)}
                  className={`h-9 px-3 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                    isActive
                      ? "bg-white text-[#1B2D21] font-bold shadow-sm"
                      : "text-white hover:bg-white/10"
                  }`}
                >
                  {lang.label}
                </button>
              );
            })}
          </div>
        </header>

        {/* Main hero & benefits area: 1 col on mobile, 2 cols on lg */}
        <main className="flex-1 flex flex-col justify-center my-4 lg:my-0">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left Column: Hero proposition & Action buttons */}
            <div className="lg:col-span-7 flex flex-col items-start gap-6 sm:gap-8">
              <div className="flex flex-col gap-3 sm:gap-4">
                <h1 className="text-4xl sm:text-5xl lg:text-5xl font-extrabold text-white tracking-tight leading-[1.15] drop-shadow-md">
                  Water your fields at the right time
                </h1>
                <p className="text-base sm:text-lg text-white/90 leading-relaxed max-w-xl drop-shadow-sm">
                  Simple advice for every field, in your own language.
                </p>
              </div>

              {/* Action buttons (at least 56px tall, full-width on mobile) */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
                <Link
                  href="/signup"
                  className="min-h-[56px] w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-white text-[#1B2D21] font-bold text-base sm:text-lg shadow-lg hover:bg-white/90 active:scale-95 transition-all flex items-center justify-center text-center"
                >
                  Sign up
                </Link>
                <Link
                  href="/login"
                  className="min-h-[56px] w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-white/15 hover:bg-white/25 backdrop-blur-md border-2 border-white text-white font-bold text-base sm:text-lg shadow-lg active:scale-95 transition-all flex items-center justify-center text-center"
                >
                  Log in
                </Link>
              </div>
            </div>

            {/* Right Column: Three benefit rows in glass card */}
            <div className="lg:col-span-5 w-full">
              <div className="bg-white/15 backdrop-blur-md border border-white/25 rounded-3xl p-6 sm:p-7 shadow-xl flex flex-col gap-5 sm:gap-6">
                {BENEFITS.map((benefit) => {
                  const IconComponent = benefit.Icon;
                  return (
                    <div key={benefit.title} className="flex items-center gap-4">
                      {/* 48px glass icon box with white icon */}
                      <div className="w-12 h-12 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center shrink-0 shadow-xs">
                        <IconComponent className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex flex-col">
                        <h2 className="text-base sm:text-lg font-bold text-white leading-snug drop-shadow-xs">
                          {benefit.title}
                        </h2>
                        <p className="text-sm text-white/85 leading-relaxed">
                          {benefit.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="w-full py-2 text-center shrink-0">
          <p className="text-xs sm:text-sm text-white/80 drop-shadow-xs">
            Built for farmers. Free to use.
          </p>
        </footer>
      </div>
    </div>
  );
}
