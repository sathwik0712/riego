// Fields Page
// Displays all registered fields and a prominent "Add Field" button to register new fields

import Link from "next/link";
import { getFields } from "../../lib/api";
import { STRINGS } from "../../lib/strings";
import FieldCard from "../../components/FieldCard";

export const metadata = {
  title: "My Fields - Riego",
  description: "View and manage your registered farm fields and sensors.",
};

export default async function FieldsPage() {
  const fields = await getFields();

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      {/* Header with Title and prominent "Add Field" button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-[#DCD6C0] shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#EFEAD8] border border-[#D1CAAD] flex items-center justify-center text-2xl">
            🌾
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-extrabold text-[#1B2D21]">
                {STRINGS.fieldsHeader}
              </h1>
              <span className="text-xs font-bold text-[#235334] bg-[#EAF5EB] px-2.5 py-0.5 rounded-full border border-[#A3D9A5]">
                {fields.length} Registered
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#5F6E62]">
              Manage your agricultural plots and soil moisture sensors
            </p>
          </div>
        </div>

        {/* Big accessible Add Field button (at least 56px tall) */}
        <Link
          href="/fields/new"
          className="min-h-[56px] inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-[#235334] text-[#FAF7EE] font-bold text-base shadow-sm hover:bg-[#1A3E27] active:scale-95 transition-all self-stretch sm:self-auto"
        >
          <span className="text-xl" aria-hidden="true">＋</span>
          <span>Add Field</span>
        </Link>
      </div>

      {/* Grid of registered field cards */}
      <section aria-label="Registered fields list" className="flex flex-col gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
          {fields.map((field) => (
            <FieldCard key={field.id} field={field} />
          ))}

          {/* New field registration shortcut card */}
          <Link
            href="/fields/new"
            className="min-h-[160px] rounded-3xl border-2 border-dashed border-[#D1CAAD] bg-[#FAF7EE] hover:bg-[#F2EDDC] hover:border-[#235334] transition-all p-6 flex flex-col items-center justify-center text-center gap-2 group cursor-pointer"
          >
            <div className="w-12 h-12 rounded-2xl bg-white border border-[#DCD6C0] flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
              🌱
            </div>
            <span className="font-extrabold text-[#235334] text-base">
              + Register Another Field
            </span>
            <span className="text-xs text-[#5F6E62]">
              Connect crop, soil, and sensor
            </span>
          </Link>
        </div>
      </section>

      {/* Week 2 feature roadmap note */}
      <div className="p-4 rounded-2xl bg-[#EFEAD8] border border-[#D1CAAD] text-xs sm:text-sm text-[#5F6E62] flex items-center gap-3">
        <span className="text-xl">ℹ️</span>
        <p>
          Detailed sensor timelines, root-zone depth analytics, and weekly history graphs will appear here in later weeks.
        </p>
      </div>
    </div>
  );
}
