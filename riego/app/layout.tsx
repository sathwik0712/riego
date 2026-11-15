import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Riego - Smart Irrigation for Farmers",
  description:
    "AI-Powered Smart Irrigation Platform for Smallholder Farmers. Real-time soil moisture and weather recommendations.",
};

// Root layout: minimal shell providing html, body, fonts, and global styles
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#FAF7EE] text-[#1B2D21] overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}
