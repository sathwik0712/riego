"use client";

// Alerts Page
// Farmer notifications with severity filtering, read/unread states, and action recommendations
// Uses shared design system: 4-tier type scale, rounded-3xl, p-6, 48px icon boxes, gap-4/gap-6

import { useEffect, useState } from "react";
import { getRecentAlerts } from "../../lib/api";
import { sampleAlerts } from "../../lib/sampleData";
import { STRINGS } from "../../lib/strings";
import { Alert, AlertSeverity } from "../../lib/types";
import { BellIcon, SpeakerIcon } from "../../components/icons";

// Visual configuration for alert severity levels
const SEVERITY_CONFIG: Record<
  AlertSeverity,
  {
    label: string;
    icon: string;
    badgeBg: string;
    badgeBorder: string;
    badgeText: string;
    borderUnread: string;
    borderRead: string;
    actionBg: string;
    actionBorder: string;
    actionText: string;
  }
> = {
  critical: {
    label: "Critical",
    icon: "🚨",
    badgeBg: "bg-[#FEE2E2]",
    badgeBorder: "border-[#FCA5A5]",
    badgeText: "text-[#991B1B]",
    borderUnread: "border-[#DC2626] border-2",
    borderRead: "border-[#FCA5A5] border",
    actionBg: "bg-[#FEF2F2]",
    actionBorder: "border-[#FCA5A5]/60",
    actionText: "text-[#7F1D1D]",
  },
  warning: {
    label: "Warning",
    icon: "⚠",
    badgeBg: "bg-[#FEF3C7]",
    badgeBorder: "border-[#FCD34D]",
    badgeText: "text-[#92400E]",
    borderUnread: "border-[#D97706] border-2",
    borderRead: "border-[#FCD34D] border",
    actionBg: "bg-[#FFFBEB]",
    actionBorder: "border-[#FCD34D]/60",
    actionText: "text-[#78350F]",
  },
  info: {
    label: "Info",
    icon: "ℹ",
    badgeBg: "bg-[#EFF6FF]",
    badgeBorder: "border-[#BAE6FD]",
    badgeText: "text-[#0369A1]",
    borderUnread: "border-[#0284C7] border-2",
    borderRead: "border-[#BAE6FD] border",
    actionBg: "bg-[#F0F9FF]",
    actionBorder: "border-[#BAE6FD]/60",
    actionText: "text-[#0C4A6E]",
  },
};

type FilterCategory = "all" | AlertSeverity;

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>(sampleAlerts);
  const [activeFilter, setActiveFilter] = useState<FilterCategory>("all");
  const [playingId, setPlayingId] = useState<string | null>(null);

  // Load latest alerts through api helper
  useEffect(() => {
    getRecentAlerts().then(setAlerts);
  }, []);

  // Filter counts calculated directly from data
  const totalCount = alerts.length;
  const criticalCount = alerts.filter((a) => a.severity === "critical").length;
  const warningCount = alerts.filter((a) => a.severity === "warning").length;
  const infoCount = alerts.filter((a) => a.severity === "info").length;
  const unreadCount = alerts.filter((a) => !a.isRead).length;

  // Filtered alert list
  const filteredAlerts = alerts.filter((alert) => {
    if (activeFilter === "all") return true;
    return alert.severity === activeFilter;
  });

  // Simulated speaker read-aloud action
  const handleSpeakerClick = (id: string) => {
    setPlayingId(id);
    setTimeout(() => setPlayingId(null), 1200);
  };

  const tabs: { id: FilterCategory; label: string; count: number }[] = [
    { id: "all", label: "All", count: totalCount },
    { id: "critical", label: "Critical", count: criticalCount },
    { id: "warning", label: "Warning", count: warningCount },
    { id: "info", label: "Info", count: infoCount },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Header Card */}
      <section
        aria-label="Alerts Header"
        className="bg-white rounded-3xl p-6 border border-[#DCD6C0] shadow-sm flex items-start gap-4"
      >
        <div className="w-12 h-12 rounded-2xl bg-[#FFFBEB] flex items-center justify-center text-[#D97706] shrink-0">
          <BellIcon className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-[#1B2D21]">
              {STRINGS.nav.alerts}
            </h1>
            <span className="text-sm font-semibold bg-[#FEE2E2] text-[#DC2626] px-3 py-0.5 rounded-full border border-[#FCA5A5]">
              {unreadCount} unread
            </span>
          </div>
          <p className="text-sm text-[#5F6E62] mt-1">
            Real-time notifications, drought warnings, and recommended actions for your fields.
          </p>
        </div>
      </section>

      {/* 2. Filter Tabs (minimum 56px touch target, active tab dark green) */}
      <section aria-label="Filter Alerts">
        <div
          role="tablist"
          className="grid grid-cols-2 sm:flex sm:items-center gap-2.5 sm:gap-3"
        >
          {tabs.map((tab) => {
            const isActive = activeFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveFilter(tab.id)}
                className={`min-h-[56px] px-4 py-3 rounded-2xl text-base transition-all flex items-center justify-center gap-2 ${
                  isActive
                    ? "bg-[#235334] text-[#FAF7EE] font-bold shadow-sm"
                    : "bg-white hover:bg-[#EFEAD8] text-[#1B2D21] border border-[#DCD6C0] font-semibold"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-sm px-2 py-0.5 rounded-full font-bold ${
                    isActive
                      ? "bg-[#1A3E27] text-[#FAF7EE]"
                      : "bg-[#EFEAD8] text-[#5F6E62]"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 3. Alert Cards Grid (1-col on phone, 2-col on tablet/desktop, gap-4) */}
      <section aria-label="Alert List">
        {filteredAlerts.length === 0 ? (
          // Empty State
          <div className="bg-white rounded-3xl p-8 border border-[#DCD6C0] shadow-sm text-center flex flex-col items-center justify-center min-h-[220px]">
            <div className="w-12 h-12 rounded-2xl bg-[#EAF5EB] flex items-center justify-center text-[#2E7D32] mb-3 text-2xl">
              ✓
            </div>
            <h3 className="text-xl font-bold text-[#1B2D21]">No alerts found</h3>
            <p className="text-sm text-[#5F6E62] mt-1 max-w-sm">
              Everything is running smoothly for this category.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-stretch">
            {filteredAlerts.map((alert) => {
              const config = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.info;
              const isUnread = !alert.isRead;
              const isPlaying = playingId === alert.id;

              return (
                <article
                  key={alert.id}
                  className={`bg-white rounded-3xl p-6 shadow-sm flex flex-col justify-between transition-all ${
                    isUnread
                      ? `${config.borderUnread} opacity-100`
                      : `${config.borderRead} opacity-85 hover:opacity-100`
                  }`}
                >
                  <div>
                    {/* Top row: Severity badge & Time */}
                    <div className="flex items-center justify-between gap-2">
                      {/* Icon + Word Badge (color is never the only signal) */}
                      <div
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-full border ${config.badgeBg} ${config.badgeBorder} ${config.badgeText} text-sm font-semibold shrink-0`}
                      >
                        <span aria-hidden="true">{config.icon}</span>
                        <span>{config.label}</span>
                      </div>

                      {/* Time label + Unread indicator dot */}
                      <div className="flex items-center gap-2">
                        {isUnread && (
                          <span
                            className="w-2.5 h-2.5 rounded-full bg-[#DC2626]"
                            title="Unread alert"
                            aria-label="Unread alert"
                          />
                        )}
                        <span className="text-sm text-[#5F6E62] whitespace-nowrap">
                          {alert.timeLabel || alert.timeAgo}
                        </span>
                      </div>
                    </div>

                    {/* Field name with field icon */}
                    <div className="flex items-center gap-1.5 text-sm text-[#5F6E62] mt-3">
                      <span aria-hidden="true">🌾</span>
                      <span className="font-medium">{alert.fieldName}</span>
                    </div>

                    {/* Title row + Speaker button (at least 56px touch target) */}
                    <div className="flex items-start justify-between gap-3 mt-2">
                      <div className="flex-1 min-w-0">
                        <h2 className="text-xl font-bold text-[#1B2D21] leading-snug">
                          {alert.title}
                        </h2>
                        {alert.message && (
                          <p className="text-base text-[#5F6E62] mt-1 leading-relaxed">
                            {alert.message}
                          </p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSpeakerClick(alert.id)}
                        aria-label={`Read alert aloud: ${alert.title}`}
                        title="Read alert aloud"
                        className={`min-w-[56px] min-h-[56px] w-14 h-14 rounded-2xl flex items-center justify-center transition-all shadow-sm shrink-0 border ${
                          isPlaying
                            ? "bg-[#235334] text-[#FAF7EE] scale-105 border-[#235334]"
                            : "bg-[#FAF7EE] text-[#1B2D21] hover:bg-[#EFEAD8] active:scale-95 border-[#D1CAAD]"
                        }`}
                      >
                        <SpeakerIcon className="w-6 h-6" />
                      </button>
                    </div>
                  </div>

                  {/* Recommended Action box (tinted background matching severity) */}
                  <div
                    className={`mt-4 p-4 rounded-2xl border ${config.actionBg} ${config.actionBorder}`}
                  >
                    <p className="text-sm text-[#5F6E62] font-medium mb-1">
                      Recommended action
                    </p>
                    <p
                      className={`text-base font-semibold leading-snug ${config.actionText}`}
                    >
                      {alert.recommendedAction}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
