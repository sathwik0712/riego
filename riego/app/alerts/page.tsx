// Alerts Tab Placeholder (Coming Soon)
// Drought warnings, sensor failure notices, and push notifications will be here

import Link from "next/link";
import { STRINGS } from "../../lib/strings";

export default function AlertsPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center py-6 sm:py-10">
      <div className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-10 border border-[#DCD6C0] shadow-sm flex flex-col items-center">
        <div className="w-20 h-20 rounded-3xl bg-[#EFEAD8] border-2 border-[#D1CAAD] flex items-center justify-center text-4xl shadow-sm mb-4">
          🔔
        </div>

        <span className="text-xs font-bold uppercase tracking-wider text-[#2E7D32] bg-[#EAF5EB] px-3.5 py-1 rounded-full border border-[#A3D9A5] mb-2">
          {STRINGS.comingSoon.title}
        </span>

        <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1B2D21] mb-2">
          {STRINGS.nav.alerts}
        </h2>

        <p className="text-sm sm:text-base text-[#5F6E62] max-w-sm leading-relaxed mb-6">
          {STRINGS.comingSoon.alertsDescription}
        </p>

        <Link
          href="/"
          className="min-h-[56px] min-w-[200px] inline-flex items-center justify-center px-6 py-3 rounded-2xl bg-[#235334] text-[#FAF7EE] font-bold text-base shadow-sm hover:bg-[#1A3E27] active:scale-95 transition-all"
        >
          ← {STRINGS.comingSoon.backHome}
        </Link>
      </div>
    </div>
  );
}
