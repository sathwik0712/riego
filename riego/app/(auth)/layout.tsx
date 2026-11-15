"use client";

// Bare layout for auth pages
// For /welcome: renders full-screen without forced padding or cream background
// For /signup and /login: preserves centered cream background and padding

import { usePathname } from "next/navigation";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isWelcome = pathname === "/welcome";

  if (isWelcome) {
    return <div className="min-h-screen w-full flex flex-col">{children}</div>;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 bg-[#FAF7EE] overflow-x-hidden">
      {children}
    </div>
  );
}
