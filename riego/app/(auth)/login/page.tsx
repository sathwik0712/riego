import Link from "next/link";
import Logo from "@/components/Logo";

export const metadata = {
  title: "Log in - Riego",
  description: "Log in to your Riego farmer account",
};

// Log in page placeholder (same layout as signup)
export default function LoginPage() {
  return (
    <div className="w-full max-w-[480px] mx-auto py-4 sm:py-6 flex flex-col gap-5 sm:gap-6">
      {/* Header: Centred Logo above the card, Back link in row below */}
      <header className="flex flex-col items-center gap-3 w-full">
        {/* Centred Logo above the card */}
        <Logo size="lg" tone="dark" showName={true} />

        {/* Small row below with Back link */}
        <div className="flex items-center justify-between w-full px-1">
          <Link
            href="/welcome"
            className="min-h-[56px] min-w-[56px] inline-flex items-center gap-1.5 text-sm sm:text-base font-bold text-[#235334] hover:text-[#1A3E27] py-2 px-1 rounded-xl transition-colors"
          >
            <span aria-hidden="true">←</span>
            <span>Back</span>
          </Link>
        </div>
      </header>

      {/* Main card */}
      <div className="w-full bg-white rounded-3xl p-6 sm:p-8 border border-[#DCD6C0] shadow-sm flex flex-col items-center text-center gap-3">
        {/* Page title */}
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1B2D21]">
          Log in
        </h1>

        {/* Helper message in sentence case */}
        <p className="text-base text-[#5F6E62]">
          Login form coming next
        </p>
      </div>
    </div>
  );
}
