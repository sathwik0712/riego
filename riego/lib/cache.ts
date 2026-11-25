// lib/cache.ts
// Saves and loads dashboard data in localStorage so the app shows something
// even when the backend cannot be reached (e.g. offline or server stopped).
// Also tracks per-session done state keyed by field id + slot start time.
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
    // Ensure device_key is never cached even if present in BackendField objects
    const sanitizedFields = data.fields.map((f) => {
      const copy = { ...f };
      delete copy.device_key;
      return copy;
    });
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        ...data,
        fields: sanitizedFields,
      })
    );
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

const PLAN_CACHE_KEY = "riego_plan_v1";

export interface PlanCache {
  savedAt: string; // ISO timestamp
  slots: import("./types").PlanSlot[];
}

/** Save plan slots into localStorage for offline resilience. */
export function savePlanCache(slots: import("./types").PlanSlot[]): void {
  try {
    localStorage.setItem(
      PLAN_CACHE_KEY,
      JSON.stringify({
        savedAt: new Date().toISOString(),
        slots,
      })
    );
  } catch {
    // localStorage full or not available — ignore silently
  }
}

/** Load previously saved plan from localStorage, or null if nothing is stored. */
export function loadPlanCache(): PlanCache | null {
  try {
    const raw = localStorage.getItem(PLAN_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PlanCache;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Full cache wipe — call on logout or on login to avoid cross-farmer bleed.
// ─────────────────────────────────────────────────────────────────────────────

/** Remove all farmer-specific cached data from localStorage. */
export function clearAllFarmerCaches(): void {
  try {
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(PLAN_CACHE_KEY);
    localStorage.removeItem("riego_session_done_v1");
  } catch {
    // quota or unavailable — ignore silently
  }
}
