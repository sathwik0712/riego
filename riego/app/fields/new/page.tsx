// Field Registration Page (/fields/new)
// Multi-step registration flow centered with max-width ~600px

import Link from "next/link";
import FieldRegistrationForm from "../../../components/FieldRegistrationForm";

export const metadata = {
  title: "Register New Field - Riego",
  description:
    "Register a new agricultural plot with crop, soil, water source, and sensor details.",
};

export default function NewFieldPage() {
  return (
    <div className="w-full max-w-[600px] mx-auto py-2 sm:py-4 flex flex-col gap-4">
      {/* Top back navigation breadcrumb */}
      <div>
        <Link
          href="/fields"
          className="inline-flex items-center gap-2 text-sm sm:text-base font-bold text-[#235334] hover:text-[#1A3E27] py-2 px-1 rounded-xl transition-colors"
        >
          <span aria-hidden="true">←</span>
          <span>Back to My Fields</span>
        </Link>
      </div>

      {/* Page Title */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1B2D21]">
          Register New Field
        </h1>
        <p className="text-xs sm:text-sm text-[#5F6E62]">
          Fill in your plot and sensor details to receive AI irrigation advice.
        </p>
      </div>

      {/* Main Multi-Step Form Component */}
      <FieldRegistrationForm />
    </div>
  );
}

