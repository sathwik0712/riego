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
// Per-session Done state: keyed by "fieldId|slotStart" (ISO string).
// Records older than 3 days are pruned on write to avoid unbounded growth.
// ─────────────────────────────────────────────────────────────────────────────

const SESSION_DONE_KEY = "riego_session_done_v1";
const SESSION_DONE_TTL_DAYS = 3;

/** Map of sessionKey → ISO timestamp when Done was recorded. */
type SessionDoneStore = Record<string, string>;

/** Build the localStorage key for a single session. */
export function sessionDoneKey(fieldId: number, slotStart: string): string {
  return `${fieldId}|${slotStart}`;
}

function loadSessionDoneStore(): SessionDoneStore {
  try {
    const raw = localStorage.getItem(SESSION_DONE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as SessionDoneStore;
  } catch {
    return {};
  }
}

function saveSessionDoneStore(store: SessionDoneStore): void {
  try {
    localStorage.setItem(SESSION_DONE_KEY, JSON.stringify(store));
  } catch {
    // quota or unavailable — ignore silently
  }
}

/** Remove entries older than SESSION_DONE_TTL_DAYS days. */
export function pruneSessionDoneCache(): void {
  const store = loadSessionDoneStore();
  const cutoff = Date.now() - SESSION_DONE_TTL_DAYS * 24 * 60 * 60 * 1000;
  let changed = false;
  for (const key of Object.keys(store)) {
    const ts = new Date(store[key]).getTime();
    if (isNaN(ts) || ts < cutoff) {
      delete store[key];
      changed = true;
    }
  }
  if (changed) saveSessionDoneStore(store);
}

/** Mark a session as done in localStorage. Prunes old records on each write. */
export function markSessionDone(fieldId: number, slotStart: string, doneAt: string): void {
  pruneSessionDoneCache();
  const store = loadSessionDoneStore();
  store[sessionDoneKey(fieldId, slotStart)] = doneAt;
  saveSessionDoneStore(store);
}

/** Returns the doneAt timestamp if this exact session has been completed, or null. */
export function getSessionDoneAt(fieldId: number, slotStart: string): string | null {
  const store = loadSessionDoneStore();
  return store[sessionDoneKey(fieldId, slotStart)] ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Full cache wipe — call on logout or on login to avoid cross-farmer bleed.
// ─────────────────────────────────────────────────────────────────────────────

/** Remove all farmer-specific cached data from localStorage. */
export function clearAllFarmerCaches(): void {
  try {
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(PLAN_CACHE_KEY);
    localStorage.removeItem(SESSION_DONE_KEY);
  } catch {
    // quota or unavailable — ignore silently
  }
}
