// lib/cache.ts
// Saves and loads dashboard data in localStorage so the app shows something
// even when the backend cannot be reached (e.g. offline or server stopped).
// All reads and writes are wrapped in try/catch — a storage failure never crashes the page.

const CACHE_KEY = "riego_dashboard_v1";

// Shape of what we store in localStorage
export interface DashboardCache {
  savedAt: string; // ISO timestamp so we can display "last saved N minutes ago" if needed
  fields: import("./types").BackendField[];
  conditionsByFieldId: Record<number, import("./types").FieldConditions>;
}

/** Save dashboard data. Silently ignores quota or security errors. */
export function saveDashboardCache(data: DashboardCache): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    // localStorage full or not available — ignore silently
  }
}

/** Load previously saved dashboard data, or null if nothing is stored. */
export function loadDashboardCache(): DashboardCache | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as DashboardCache;
  } catch {
    // Parse error or storage not available
    return null;
  }
}
