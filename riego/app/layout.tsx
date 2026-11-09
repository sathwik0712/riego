import type { Metadata } from "next";
import "./globals.css";
import TopBar from "../components/TopBar";
import BottomNav from "../components/BottomNav";
import Sidebar from "../components/Sidebar";

export const metadata: Metadata = {
  title: "Riego - Smart Irrigation for Farmers",
  description:
    "AI-Powered Smart Irrigation Platform for Smallholder Farmers. Real-time soil moisture and weather recommendations.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#FAF7EE] text-[#1B2D21] overflow-x-hidden">
        {/* Fixed desktop left sidebar (hidden on mobile and tablet) */}
        <Sidebar farmerInitial="R" farmerName="Ramesh Kumar" />

        {/* Main layout container (offset by sidebar on desktop) */}
        <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
          {/* Top bar spanning content area */}
          <TopBar farmerInitial="R" />

          {/* Responsive main content container */}
          <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 md:px-8 lg:px-8 py-4 sm:py-6 lg:py-8 pb-28 lg:pb-12">
            {children}
          </main>
        </div>

        {/* Fixed bottom navigation on phone & tablet (hidden on desktop) */}
        <BottomNav />
      </body>
    </html>
  );
}
