// API Connection Layer for Riego
// Communicates with the FastAPI backend and provides friendly farmer-facing error handling.
// Every call to a protected endpoint sends "Authorization: Bearer <token>".
// A 401 response clears the session and redirects to /login.

import {
  sampleAdvice,
  sampleAlerts,
  sampleFarmer,
  sampleFields,
  sampleSchedule,
} from "./sampleData";
import {
  Advice,
  Alert,
  BackendField,
  FarmerProfile,
  FieldConditions,
  FieldCreateData,
  FieldRecommendation,
  IrrigationLogEntry,
  IrrigationLogResponse,
  ManualReadingResponse,
  PlanSlot,
  ScheduleItem,
  SensorHistoryResponse,
  PlaceResult,
  ReversePlaceResult,
} from "./types";

export type { PlaceResult, ReversePlaceResult };

// Base API address from environment variable (falls back to local FastAPI backend)
const BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "");

// Custom error with HTTP status code and farmer-friendly message
export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

// Paths that do NOT need an Authorization header
const UNPROTECTED_PATHS = new Set([
  "/health",
  "/auth/request-otp",
  "/auth/verify-otp",
  "/auth/signup",
]);

function isProtected(path: string): boolean {
  const normalised = path.startsWith("/") ? path : `/${path}`;
  // sensor-readings POST is unprotected (hardware device ingest handled server-side)
  // but we don't call that from the frontend, so checking the set is enough here
  return !UNPROTECTED_PATHS.has(normalised);
}

/** Handle a 401: clear session + all cached data, then redirect to /login. */
function handle401(): never {
  // Import lazily to avoid circular deps at module load time
  const { clearSession } = require("./auth") as typeof import("./auth");
  const { clearAllFarmerCaches } = require("./cache") as typeof import("./cache");
  clearSession();
  clearAllFarmerCaches();
  if (typeof window !== "undefined") {
    const url = new URL("/login", window.location.href);
    url.searchParams.set("reason", "session_expired");
    window.location.href = url.toString();
  }
  // TypeScript needs a never return; throw to satisfy it
  throw new ApiError(401, "Please log in again");
}

// Core request helper: sends JSON, aborts after 10 seconds, parses responses
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${BASE_URL}${normalizedPath}`;

  // Abort request if it takes longer than 10 seconds
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  // Build headers — add bearer token for protected paths
  const extraHeaders: Record<string, string> = {};
  if (isProtected(normalizedPath) && typeof window !== "undefined") {
    const { getToken } = require("./auth") as typeof import("./auth");
    const token = getToken();
    if (token) {
      extraHeaders["Authorization"] = `Bearer ${token}`;
    }
  }

  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...extraHeaders,
        ...(options.headers || {}),
      },
      signal: controller.signal,
    });

    // Parse JSON if the response contains it
    let data: any = null;
    const contentType = res.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      try {
        data = await res.json();
      } catch {
        data = null;
      }
    }

    // 401: session expired or invalid — clear and redirect
    if (res.status === 401) {
      handle401();
    }

    // Handle HTTP error responses
    if (!res.ok) {
      // Server error (500 and above)
      if (res.status >= 500) {
        throw new ApiError(res.status, "Something went wrong. Please try again.");
      }

      // Client error (400, 404, etc.): use server's message when available
      let message = "";
      if (data) {
        if (typeof data.detail === "string") {
          message = data.detail;
        } else if (Array.isArray(data.detail) && data.detail[0]?.msg) {
          message = data.detail.map((item: any) => item.msg).join(", ");
        } else if (typeof data.message === "string") {
          message = data.message;
        }
      }

      if (!message) {
        message = res.status === 404 ? "Item not found." : "Something went wrong. Please try again.";
      }

      throw new ApiError(res.status, message);
    }

    return data as T;
  } catch (err: unknown) {
    if (err instanceof ApiError) {
      throw err;
    }

    // Network disconnection, DNS failure, or 10s timeout
    throw new ApiError(0, "Could not reach the server. Check your internet and try again.");
  } finally {
    clearTimeout(timeoutId);
  }
}

// Send a GET request to the backend
export async function apiGet<T>(path: string): Promise<T> {
  return request<T>(path, { method: "GET" });
}

// Send a POST request with JSON body to the backend
export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method: "POST",
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

// Send a PATCH request with JSON body to the backend
export async function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method: "PATCH",
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

// ----------------------------------------------------------------------------
// Auth API calls (unprotected)
// ----------------------------------------------------------------------------

export interface RequestOtpResponse {
  message: string;
  expires_in_seconds: number;
}

export interface VerifyOtpResponse {
  token: string;
  farmer: {
    farmer_id: string;
    name: string;
    phone: string;
    village: string;
    preferred_language: string;
    created_at: string;
  };
}

export interface SignupResponse {
  farmer_id: string;
  name: string;
  phone: string;
  village: string;
  preferred_language: string;
  created_at: string;
  token: string;
}

/** POST /auth/request-otp */
export async function requestOtp(phone: string): Promise<RequestOtpResponse> {
  return apiPost<RequestOtpResponse>("/auth/request-otp", { phone });
}

/** POST /auth/verify-otp */
export async function verifyOtp(phone: string, otp: string): Promise<VerifyOtpResponse> {
  return apiPost<VerifyOtpResponse>("/auth/verify-otp", { phone, otp });
}

/** POST /auth/signup */
export async function signupFarmer(data: {
  name: string;
  phone: string;
  village: string;
  preferred_language: string;
}): Promise<SignupResponse> {
  return apiPost<SignupResponse>("/auth/signup", data);
}

/** GET /auth/me — returns the current farmer from their token. */
export async function getMe(): Promise<SignupResponse> {
  return apiGet<SignupResponse>("/auth/me");
}

/** POST /auth/logout — invalidates the token on the server. Ignores failures. */
export async function logoutFromServer(): Promise<void> {
  try {
    await apiPost<{ message: string }>("/auth/logout");
  } catch {
    // best-effort — always clear locally regardless
  }
}

// ----------------------------------------------------------------------------
// Prototype data access functions (kept for existing screens until connected)
// ----------------------------------------------------------------------------

export async function getFarmerProfile(): Promise<FarmerProfile> {
  return sampleFarmer;
}

export async function getAdvice(): Promise<Advice> {
  // Sample advice — connects to ML engine in a later step
  return sampleAdvice;
}

// Fetch all registered fields from the backend
export async function getFields(): Promise<BackendField[]> {
  try {
    return await apiGet<BackendField[]>("/fields");
  } catch (err) {
    // If backend is unreachable during server-side build prerendering, fall back gracefully
    if (typeof window === "undefined") {
      return sampleFields.map((f, i) => ({
        id: i + 1,
        farmer_id: "farmer_001",
        nickname: f.name,
        name: f.name,
        crop: f.crop,
        latitude: 13.0827,
        longitude: 77.5877,
        area: 2.5,
        area_unit: "acres",
        sowing_date: f.sownDate || null,
        soil_type: "Loamy",
        water_source: "Borewell",
        irrigation_method: "Drip",
        pump_flow_rate: null,
        has_sensor: true,
        device_id: null,
        registered_at: new Date().toISOString(),
        growth_stage: f.growthStage || "Vegetative",
        moisturePercentage: f.moisturePercentage,
        status: f.status,
      })) as any;
    }
    throw err;
  }
}

// Fetch a single field by ID
export async function getField(fieldId: number): Promise<BackendField> {
  return apiGet<BackendField>(`/fields/${fieldId}`);
}

// Record a manual soil moisture reading for a field
export async function addManualReading(
  fieldId: number,
  moisturePercent: number
): Promise<ManualReadingResponse> {
  return apiPost<ManualReadingResponse>(`/fields/${fieldId}/manual-reading`, {
    moisture_percent: moisturePercent,
  });
}

// Register a new field on the backend
export async function createField(data: FieldCreateData): Promise<BackendField> {
  const payload: Record<string, any> = { ...data };

  // Only send pump_flow_rate if farmer gave one (> 0); never send 0 or empty string
  if (
    payload.pump_flow_rate === undefined ||
    payload.pump_flow_rate === null ||
    payload.pump_flow_rate === "" ||
    Number(payload.pump_flow_rate) <= 0 ||
    isNaN(Number(payload.pump_flow_rate))
  ) {
    delete payload.pump_flow_rate;
  } else {
    payload.pump_flow_rate = Number(payload.pump_flow_rate);
  }

  // Only send pump_hp if farmer gave one (> 0); never send 0 or empty string
  if (
    payload.pump_hp === undefined ||
    payload.pump_hp === null ||
    payload.pump_hp === "" ||
    Number(payload.pump_hp) <= 0 ||
    isNaN(Number(payload.pump_hp))
  ) {
    delete payload.pump_hp;
  } else {
    payload.pump_hp = Number(payload.pump_hp);
  }

  // Remove farmer_id from the payload — the backend reads it from the token
  delete payload.farmer_id;

  return apiPost<BackendField>("/fields", payload as FieldCreateData);
}

// Fetch telemetry and combined conditions for a single field
export async function getFieldConditions(fieldId: number): Promise<FieldConditions> {
  return apiGet<FieldConditions>(`/fields/${fieldId}/conditions`);
}

// Fetch sensor reading history for a field for the last N hours (default 168 = 7 days)
export async function getSensorHistory(fieldId: number, hours = 168): Promise<SensorHistoryResponse> {
  return apiGet<SensorHistoryResponse>(`/sensor-readings/${fieldId}/history?hours=${hours}`);
}

// Record an irrigation event for a field (started_at = now UTC, event_source = farmer_tap, irrigated_at = now UTC)
// If the backend returns 404 or 422 for the recommendation_id, retries once without it.
export async function logIrrigation(
  fieldId: number,
  durationMinutes: number,
  recommendationId?: number | null
): Promise<IrrigationLogEntry> {
  const nowIso = new Date().toISOString();
  const payload = {
    field_id: fieldId,
    duration_minutes: durationMinutes,
    started_at: nowIso,
    irrigated_at: nowIso,
    event_source: "farmer_tap",
    source: "farmer",
    recommendation_id: recommendationId ?? null,
  };

  try {
    return await apiPost<IrrigationLogEntry>("/irrigation-log", payload);
  } catch (err: any) {
    if (recommendationId && (err?.status === 404 || err?.status === 422)) {
      return await apiPost<IrrigationLogEntry>("/irrigation-log", {
        ...payload,
        recommendation_id: null,
      });
    }
    throw err;
  }
}

// Fetch irrigation logs for a field over the last N days (default 1 day)
export async function getIrrigationLog(
  fieldId: number,
  days = 1
): Promise<IrrigationLogResponse> {
  return apiGet<IrrigationLogResponse>(`/fields/${fieldId}/irrigation-log?days=${days}`);
}

// Fetch the farmer's time-slotted irrigation plan — backend infers farmer from token
export async function getTodayPlan(): Promise<PlanSlot[]> {
  return apiGet<PlanSlot[]>("/plan/today");
}

// Fetch ML recommendation and schedule for a single field
export async function getFieldRecommendation(fieldId: number): Promise<FieldRecommendation> {
  return apiGet<FieldRecommendation>(`/fields/${fieldId}/recommendation`);
}

export async function getTodaySchedule(): Promise<ScheduleItem[]> {
  // Sample schedule — connects to irrigation planner in a later step
  return sampleSchedule;
}

export async function getRecentAlerts(): Promise<Alert[]> {
  // Sample alerts — connects to alert engine in a later step
  return sampleAlerts;
}

// ----------------------------------------------------------------------------
// Geocoding and Location APIs
// ----------------------------------------------------------------------------

/** Search places by name query (2 to 80 characters). Returns up to 5 places. */
export async function searchPlaces(q: string): Promise<PlaceResult[]> {
  const trimmed = q.trim();
  if (trimmed.length < 2) return [];
  return apiGet<PlaceResult[]>(`/geo/search?q=${encodeURIComponent(trimmed)}`);
}

/** Reverse geocode coordinates to place details (name, state, country). */
export async function reversePlace(lat: number, lon: number): Promise<ReversePlaceResult | null> {
  const res = await apiGet<ReversePlaceResult | ReversePlaceResult[]>(`/geo/reverse?lat=${lat}&lon=${lon}`);
  if (!res || (Array.isArray(res) && res.length === 0)) {
    return null;
  }
  return Array.isArray(res) ? res[0] : res;
}

/** Update the latitude and longitude of an existing field. */
export async function updateFieldLocation(
  fieldId: number,
  lat: number,
  lon: number
): Promise<BackendField> {
  return apiPatch<BackendField>(`/fields/${fieldId}/location`, {
    latitude: lat,
    longitude: lon,
  });
}

