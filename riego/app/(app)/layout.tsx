"use client";

// Main application shell layout (protected by session guard)
// Redirects unauthenticated users to /welcome and shows a blank cream screen while checking

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";
import Sidebar from "@/components/Sidebar";
import { getSession, FarmerSession } from "@/lib/session";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [session, setSession] = useState<FarmerSession | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const current = getSession();
    if (!current) {
      router.replace("/welcome");
    } else {
      setSession(current);
      setChecking(false);
    }
  }, [router]);

  // Show a blank cream screen while checking to prevent any flash of content
  if (checking || !session) {
    return <div className="min-h-screen bg-[#FAF7EE]" />;
  }

  const initial = session.name ? session.name.charAt(0).toUpperCase() : "R";

  return (
    <>
      {/* Fixed desktop left sidebar (hidden on mobile and tablet) */}
      <Sidebar
        farmerInitial={initial}
        farmerName={session.name}
      />

      {/* Main layout container (offset by sidebar on desktop) */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        {/* Top bar spanning content area */}
        <TopBar
          farmerInitial={initial}
          farmerName={session.name}
          farmerPhone={session.phone}
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
