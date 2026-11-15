// Recent alerts preview component for desktop Home page
// Displays latest 2 alerts with inline SVG line icons and stacked metadata
// Follows unified card style: 4-tier type scale, 48px icon box, rounded-3xl

import Link from "next/link";
import { AlertIcon, BellIcon, CloudRainIcon, DropIcon, SignalIcon } from "./icons";
import { Alert, AlertSeverity } from "../lib/types";

interface RecentAlertsProps {
  alerts: Alert[];
}

// Visual configurations for alert severity levels
const SEVERITY_CONFIG: Record<
  AlertSeverity,
  {
    boxBg: string;
    boxBorder: string;
    dotColor: string;
    badgeBg: string;
    badgeText: string;
    badgeBorder: string;
    label: string;
  }
> = {
  critical: {
    boxBg: "bg-[#FEE2E2]",
    boxBorder: "border-[#FCA5A5]",
    dotColor: "bg-[#DC2626]",
    badgeBg: "bg-[#FEE2E2]",
    badgeText: "text-[#991B1B]",
    badgeBorder: "border-[#FCA5A5]",
    label: "Critical",
  },
  warning: {
    boxBg: "bg-[#FEF3C7]",
    boxBorder: "border-[#FCD34D]",
    dotColor: "bg-[#D97706]",
    badgeBg: "bg-[#FEF3C7]",
    badgeText: "text-[#92400E]",
    badgeBorder: "border-[#FCD34D]",
    label: "Warning",
  },
  info: {
    boxBg: "bg-[#EFF6FF]",
    boxBorder: "border-[#BAE6FD]",
    dotColor: "bg-[#0284C7]",
    badgeBg: "bg-[#EFF6FF]",
    badgeText: "text-[#0369A1]",
    badgeBorder: "border-[#BAE6FD]",
    label: "Info",
  },
};

// Select appropriate SVG line icon for the 48px icon box
function getAlertIcon(alert: Alert) {
  const title = alert.title.toLowerCase();
  if (title.includes("sensor") || title.includes("offline")) {
    return <SignalIcon className="w-6 h-6 text-[#991B1B]" />;
  }
  if (title.includes("rain")) {
    return <CloudRainIcon className="w-6 h-6 text-[#92400E]" />;
  }
  if (title.includes("moisture") || title.includes("water")) {
    return <DropIcon className="w-6 h-6 text-[#92400E]" />;
  }
  return <BellIcon className="w-6 h-6 text-[#0369A1]" />;
}

// Select appropriate line icon for the severity pill (no emoji)
function getSeverityPillIcon(severity: AlertSeverity) {
  if (severity === "critical" || severity === "warning") {
    return <AlertIcon className="w-3.5 h-3.5" />;
  }
  return <BellIcon className="w-3.5 h-3.5" />;
}

export default function RecentAlerts({ alerts }: RecentAlertsProps) {
  // Show only the latest 2 alerts
  const items = alerts.slice(0, 2);

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#DCD6C0] shadow-sm flex flex-col justify-between">
      {/* Header with Title and accessible link (>=56px tap target) */}
      <div className="flex items-center justify-between pb-2 border-b border-[#F2EFE4]">
        <div>
          <h3 className="text-xl font-semibold text-[#1B2D21] leading-tight">
            Recent alerts
          </h3>
          <p className="text-sm text-[#5F6E62] mt-0.5">Farm notifications</p>
        </div>
        <Link
          href="/alerts"
          className="inline-flex items-center justify-center min-h-[56px] px-3 text-sm font-semibold text-[#235334] hover:text-[#183B25] hover:underline focus:outline-none focus:ring-2 focus:ring-[#2E7D32]/30 rounded-xl"
        >
          See all &rarr;
        </Link>
      </div>

      {/* Latest 2 alert rows */}
      <div className="flex flex-col divide-y divide-[#F2EFE4]">
        {items.map((alert) => {
          const config = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.info;
          return (
            <div
              key={alert.id}
              className="flex items-start gap-3.5 py-3 first:pt-2.5 last:pb-0"
            >
              {/* Left: 48px icon box */}
              <div
                className={`w-12 h-12 rounded-2xl ${config.boxBg} border ${config.boxBorder} flex items-center justify-center shrink-0`}
              >
                {getAlertIcon(alert)}
              </div>

              {/* Middle: 3 lines (Title, Field name · time, Severity pill) */}
              <div className="flex-1 min-w-0">
                {/* Line 1: Title on the first line (full width, fits without wrapping) */}
                <h4 className="text-base font-semibold text-[#1B2D21] leading-tight">
                  {alert.title}
                </h4>

                {/* Line 2: Field name · time on the second line */}
                <p className="text-sm text-[#5F6E62] leading-tight mt-1">
                  {alert.fieldName} · {alert.timeLabel || alert.timeAgo}
                </p>

                {/* Line 3: Severity pill (dot + icon + word) on the third line */}
                <div className="mt-2">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${config.badgeBg} ${config.badgeText} border ${config.badgeBorder}`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${config.dotColor}`}
                    />
                    {getSeverityPillIcon(alert.severity)}
                    <span>{config.label}</span>
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
