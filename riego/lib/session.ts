// Client session management using browser localStorage
// This client session storage will be replaced by the backend token from POST /auth/verify-otp.

export interface FarmerSession {
  name: string;
  phone: string;
  village: string;
  language: string;
}

// Built-in demo farmer for testing
export const DEMO_FARMER: FarmerSession = {
  name: "Ramesh Kumar",
  phone: "9876543210",
  village: "Hebballi",
  language: "en",
};

const FARMERS_KEY = "riego_farmers";
const SESSION_KEY = "riego_session";

// Helper to safely access localStorage without throwing in SSR or restricted environments
function getStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

// Save a newly registered farmer to the known farmers list
export function saveFarmer(
  name: string,
  phone: string,
  village: string,
  language: string = "en"
): FarmerSession {
  const newFarmer: FarmerSession = {
    name: name.trim(),
    phone: phone.trim(),
    village: village.trim(),
    language,
  };

  const storage = getStorage();
  if (storage) {
    try {
      const raw = storage.getItem(FARMERS_KEY);
      const list: FarmerSession[] = raw ? JSON.parse(raw) : [];
      const index = list.findIndex((f) => f.phone === newFarmer.phone);
      if (index >= 0) {
        list[index] = newFarmer;
      } else {
        list.push(newFarmer);
      }
      storage.setItem(FARMERS_KEY, JSON.stringify(list));
    } catch {
      // Ignore storage write errors
    }
  }

  return newFarmer;
}

// Look up a farmer by phone number; checks known list and built-in demo farmer
export function findFarmer(phone: string): FarmerSession | null {
  const cleanPhone = phone.trim();
  if (cleanPhone === DEMO_FARMER.phone) {
    return DEMO_FARMER;
  }

  const storage = getStorage();
  if (!storage) return null;

  try {
    const raw = storage.getItem(FARMERS_KEY);
    if (!raw) return null;
    const list: FarmerSession[] = JSON.parse(raw);
    const found = list.find((f) => f.phone === cleanPhone);
    return found || null;
  } catch {
    return null;
  }
}

// Start an active login session
export function startSession(farmer: FarmerSession): void {
  const storage = getStorage();
  if (!storage) return;

  try {
    storage.setItem(SESSION_KEY, JSON.stringify(farmer));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("riego_session_change"));
    }
  } catch {
    // Ignore storage write errors
  }
}

// Retrieve the currently active farmer session
export function getSession(): FarmerSession | null {
  const storage = getStorage();
  if (!storage) return null;

  try {
    const raw = storage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as FarmerSession;
  } catch {
    return null;
  }
}

// End the active farmer session
export function endSession(): void {
  const storage = getStorage();
  if (!storage) return;

  try {
    storage.removeItem(SESSION_KEY);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("riego_session_change"));
    }
  } catch {
    // Ignore storage write errors
  }
}
