// lib/auth.ts
// Real session management using backend tokens.
// Stores the raw bearer token and farmer profile in localStorage.
// Never stores passwords. All reads/writes are wrapped in try/catch.

export interface StoredFarmer {
  farmer_id: string;
  name: string;
  phone: string;
  village: string;
  preferred_language: string;
  /** First letter of name, upper-cased, for avatar circles. */
  initial: string;
}

const TOKEN_KEY = "riego_token_v1";
const FARMER_KEY = "riego_farmer_v1";

function getStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Save bearer token to localStorage. */
export function saveToken(token: string): void {
  try {
    getStorage()?.setItem(TOKEN_KEY, token);
  } catch {
    // quota or unavailable — ignore silently
  }
}

/** Read the stored bearer token, or null if none. */
export function getToken(): string | null {
  try {
    return getStorage()?.getItem(TOKEN_KEY) ?? null;
  } catch {
    return null;
  }
}

/** Save farmer profile to localStorage. */
export function saveFarmerProfile(farmer: Omit<StoredFarmer, "initial">): void {
  const stored: StoredFarmer = {
    ...farmer,
    initial: farmer.name ? farmer.name.charAt(0).toUpperCase() : "F",
  };
  try {
    getStorage()?.setItem(FARMER_KEY, JSON.stringify(stored));
  } catch {
    // quota or unavailable — ignore silently
  }
}

/** Read the stored farmer profile, or null if none. */
export function getFarmer(): StoredFarmer | null {
  try {
    const raw = getStorage()?.getItem(FARMER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredFarmer;
  } catch {
    return null;
  }
}

/**
 * Save both token and farmer after a successful login or signup.
 * Dispatches a custom event so layout components can re-render.
 */
export function saveSession(
  token: string,
  farmer: Omit<StoredFarmer, "initial">
): void {
  saveToken(token);
  saveFarmerProfile(farmer);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("riego_session_change"));
  }
}

/**
 * Remove the token and farmer from localStorage.
 * Also dispatches the session-change event.
 */
export function clearSession(): void {
  try {
    const storage = getStorage();
    if (!storage) return;
    storage.removeItem(TOKEN_KEY);
    storage.removeItem(FARMER_KEY);
  } catch {
    // ignore
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("riego_session_change"));
  }
}

/** Returns true if a token is currently stored (does not validate with backend). */
export function hasToken(): boolean {
  return Boolean(getToken());
}
