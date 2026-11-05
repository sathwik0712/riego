"use client";

// Fixed bottom navigation with 4 large icon buttons
// Home, Plan, Fields, Alerts - minimum 56px touch target

import Link from "next/link";
import { usePathname } from "next/navigation";
import { STRINGS } from "../lib/strings";

export default function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    {
      href: "/",
      label: STRINGS.nav.home,
      icon: (active: boolean) => (
        <svg
          className={`w-7 h-7 ${active ? "stroke-[2.5]" : "stroke-2"}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
          />
        </svg>
      ),
    },
    {
      href: "/plan",
      label: STRINGS.nav.plan,
      icon: (active: boolean) => (
        <svg
          className={`w-7 h-7 ${active ? "stroke-[2.5]" : "stroke-2"}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
    {
      href: "/fields",
      label: STRINGS.nav.fields,
      icon: (active: boolean) => (
        <svg
          className={`w-7 h-7 ${active ? "stroke-[2.5]" : "stroke-2"}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          {/* Plant / Field leaf icon */}
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 3v18m0-18C8 3 5 7 5 12c0 3 1.5 5.5 4 6.5M12 3c4 0 7 4 7 9 0 3-1.5 5.5-4 6.5"
          />
        </svg>
      ),
    },
    {
      href: "/alerts",
      label: STRINGS.nav.alerts,
      icon: (active: boolean) => (
        <svg
          className={`w-7 h-7 ${active ? "stroke-[2.5]" : "stroke-2"}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
      ),
    },
  ];

  return (
    <nav
      aria-label="Primary Navigation"
      className="fixed bottom-0 left-0 right-0 z-30 bg-[#FAF7EE] border-t-2 border-[#D1CAAD] shadow-lg safe-area-pb"
    >
      <div className="grid grid-cols-4 max-w-lg mx-auto px-2 py-1.5">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center min-h-[58px] py-1 px-1 rounded-xl transition-all ${
                isActive
                  ? "bg-[#235334] text-[#FAF7EE] font-bold shadow-sm"
                  : "text-[#3D4D41] hover:bg-[#EFEAD8] active:bg-[#E3DEC3]"
              }`}
            >
              <div className="flex items-center justify-center">
                {item.icon(isActive)}
              </div>
              <span className="text-xs font-semibold mt-1 tracking-tight">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

