// Utility functions for formatting dates and times in Asia/Kolkata (IST)

const IST_TIMEZONE = "Asia/Kolkata";

/**
 * Format an ISO timestamp string into 12-hour IST time style (e.g. "6 PM", "6:30 PM", "6 AM").
 * Always uses Asia/Kolkata timezone, never the device's local timezone.
 */
export function formatTimeIST(isoStr: string): string {
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return isoStr;

    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: IST_TIMEZONE,
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    });

    const parts = formatter.formatToParts(d);
    const hour = parts.find((p) => p.type === "hour")?.value || "";
    const minute = parts.find((p) => p.type === "minute")?.value || "";
    const dayPeriod = (parts.find((p) => p.type === "dayPeriod")?.value || "").toUpperCase();

    if (minute === "00" || minute === "0") {
      return `${hour} ${dayPeriod}`;
    }
    return `${hour}:${minute} ${dayPeriod}`;
  } catch {
    return isoStr;
  }
}

/**
 * Categorize a slot timestamp into "today", "tomorrow", or "other" in IST.
 */
export function getSlotDayGroup(isoStr: string): "today" | "tomorrow" | "other" {
  try {
    const slotDate = new Date(isoStr);
    if (isNaN(slotDate.getTime())) return "today";

    const dateFormatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: IST_TIMEZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

    const now = new Date();
    const todayStr = dateFormatter.format(now);

    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const tomorrowStr = dateFormatter.format(tomorrow);

    const slotDateStr = dateFormatter.format(slotDate);

    if (slotDateStr === todayStr) return "today";
    if (slotDateStr === tomorrowStr) return "tomorrow";
    return "other";
  } catch {
    return "today";
  }
}

/**
 * Format a saved timestamp into a friendly "Last updated" line (e.g. "19 Nov, 6 PM").
 */
export function formatLastUpdatedIST(isoStr: string): string {
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return isoStr;

    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: IST_TIMEZONE,
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    });

    return formatter.format(d);
  } catch {
    return isoStr;
  }
}
