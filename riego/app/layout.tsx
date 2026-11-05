import type { Metadata } from "next";
import "./globals.css";
import TopBar from "../components/TopBar";
import BottomNav from "../components/BottomNav";

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
      <body className="min-h-full flex flex-col bg-[#FAF7EE] text-[#1B2D21]">
        {/* Top bar with farmer profile, Riego title, help, and language toggle */}
        <TopBar farmerInitial="R" />

        {/* Centered mobile-first content area (scales smoothly up to tablet/desktop) */}
        <main className="flex-1 w-full max-w-lg mx-auto px-4 py-4 pb-28">
          {children}
        </main>

        {/* Fixed bottom navigation */}
        <BottomNav />
      </body>
    </html>
  );
}
