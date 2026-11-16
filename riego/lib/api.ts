// API Connection Layer for Riego
// Communicates with the FastAPI backend and provides friendly farmer-facing error handling

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
  ManualReadingResponse,
  ScheduleItem,
  SensorHistoryResponse,
} from "./types";

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

// Core request helper: sends JSON, aborts after 10 seconds, parses responses
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${BASE_URL}${normalizedPath}`;

  // Abort request if it takes longer than 10 seconds
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
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
  return apiPost<BackendField>("/fields", data);
}

// Fetch telemetry and combined conditions for a single field
export async function getFieldConditions(fieldId: number): Promise<FieldConditions> {
  return apiGet<FieldConditions>(`/fields/${fieldId}/conditions`);
}

// Fetch sensor reading history for a field for the last N hours (default 168 = 7 days)
export async function getSensorHistory(fieldId: number, hours = 168): Promise<SensorHistoryResponse> {
  return apiGet<SensorHistoryResponse>(`/sensor-readings/${fieldId}/history?hours=${hours}`);
}

export async function getTodaySchedule(): Promise<ScheduleItem[]> {
  // Sample schedule — connects to irrigation planner in a later step
  return sampleSchedule;
}

export async function getRecentAlerts(): Promise<Alert[]> {
  // Sample alerts — connects to alert engine in a later step
  return sampleAlerts;
}
