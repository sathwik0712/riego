"use client";

// Fixed desktop navigation sidebar (visible at 1024px and above)
// Replaces bottom navigation on larger screens with accessible icons + labels

import Link from "next/link";
import { usePathname } from "next/navigation";
import { STRINGS } from "../lib/strings";

interface SidebarProps {
  farmerInitial?: string;
  farmerName?: string;
}

export default function Sidebar({
  farmerInitial = "R",
  farmerName = "Ramesh Kumar",
}: SidebarProps) {
  const pathname = usePathname();

  const navItems = [
    {
      href: "/",
      label: STRINGS.nav.home,
      icon: (active: boolean) => (
        <svg
          className={`w-6 h-6 shrink-0 ${active ? "stroke-[2.5]" : "stroke-2"}`}
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
          className={`w-6 h-6 shrink-0 ${active ? "stroke-[2.5]" : "stroke-2"}`}
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
          className={`w-6 h-6 shrink-0 ${active ? "stroke-[2.5]" : "stroke-2"}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
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
          className={`w-6 h-6 shrink-0 ${active ? "stroke-[2.5]" : "stroke-2"}`}
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
    <aside
      aria-label="Desktop Sidebar Navigation"
      className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 bg-[#FAF7EE] border-r-2 border-[#E3DEC3]"
    >
      {/* Brand & Logo Header */}
      <div className="h-20 px-6 flex items-center gap-3 border-b border-[#E3DEC3]">
        <div className="w-11 h-11 rounded-2xl bg-[#235334] text-[#FAF7EE] flex items-center justify-center font-black text-xl shadow-sm shrink-0">
          💧
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-wide text-[#1B2D21]">
            {STRINGS.appName}
          </h1>
          <p className="text-xs font-semibold text-[#5F6E62]">
            Smart Irrigation
          </p>
        </div>
      </div>

      {/* Navigation Items List */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-4 px-4 min-h-[56px] rounded-2xl text-base font-bold transition-all ${
                isActive
                  ? "bg-[#235334] text-[#FAF7EE] shadow-sm"
                  : "text-[#3D4D41] hover:bg-[#EFEAD8] active:bg-[#E3DEC3]"
              }`}
            >
              {item.icon(isActive)}
              <span className="tracking-tight">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Farmer Profile Footer */}
      <div className="p-4 border-t border-[#E3DEC3] bg-[#F5F1E1]/60">
        <div className="flex items-center gap-3 p-2 rounded-2xl">
          <div className="w-12 h-12 rounded-full bg-[#235334] text-[#FAF7EE] font-bold text-lg flex items-center justify-center shadow-sm shrink-0">
            {farmerInitial}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-[#1B2D21] truncate">
              {farmerName}
            </p>
            <p className="text-xs text-[#5F6E62]">Farmer</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

