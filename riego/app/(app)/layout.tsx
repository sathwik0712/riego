"use client";

// Main application shell layout (protected by real token guard)
// 1. If no token → redirect to /welcome immediately.
// 2. If token present → show cached farmer data instantly, then verify with GET /auth/me.
//    - 401 from /me → clear session + caches, redirect to /login.
//    - Backend unreachable → keep showing cached farmer (do NOT log out).

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";
import Sidebar from "@/components/Sidebar";
import { getToken, getFarmer, saveSession, clearSession, StoredFarmer } from "@/lib/auth";
import { clearAllFarmerCaches } from "@/lib/cache";
import { getMe, ApiError } from "@/lib/api";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [farmer, setFarmer] = useState<StoredFarmer | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace("/welcome");
      return;
    }

    // Show cached farmer data immediately so the UI doesn't stay blank
    const cached = getFarmer();
    if (cached) {
      setFarmer(cached);
      setChecking(false);
    }

    // Verify token with the backend in the background
    getMe()
      .then((me) => {
        // Update the stored farmer with fresh data from server
        saveSession(token, {
          farmer_id: me.farmer_id,
          name: me.name,
          phone: me.phone,
          village: me.village,
          preferred_language: me.preferred_language,
        });
        setFarmer({
          farmer_id: me.farmer_id,
          name: me.name,
          phone: me.phone,
          village: me.village,
          preferred_language: me.preferred_language,
          initial: me.name ? me.name.charAt(0).toUpperCase() : "F",
        });
        setChecking(false);
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) {
          // Invalid / expired token — log out
          clearSession();
          clearAllFarmerCaches();
          router.replace("/login?reason=session_expired");
        } else {
          // Backend unreachable — use cached farmer if available; if none, redirect to welcome
          if (!cached) {
            router.replace("/welcome");
          }
          // cached farmer already set above, checking already set to false
          setChecking(false);
        }
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Show a blank cream screen while checking to prevent any flash of content
  if (checking && !farmer) {
    return <div className="min-h-screen bg-[#FAF7EE]" />;
  }

  if (!farmer) return null;

  const initial = farmer.initial || farmer.name.charAt(0).toUpperCase() || "F";

  return (
    <>
      {/* Fixed desktop left sidebar (hidden on mobile and tablet) */}
      <Sidebar
        farmerInitial={initial}
        farmerName={farmer.name}
      />

      {/* Main layout container (offset by sidebar on desktop) */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        {/* Top bar spanning content area */}
        <TopBar
          farmerInitial={initial}
          farmerName={farmer.name}
          farmerPhone={farmer.phone}
        />

        {/* Responsive main content container */}
        <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 md:px-8 lg:px-8 py-3 sm:py-4 lg:py-5 pb-28 lg:pb-8">
          {children}
        </main>
      </div>

      {/* Fixed bottom navigation on phone & tablet (hidden on desktop) */}
      <BottomNav />
    </>
  );
}
