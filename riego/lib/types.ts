// Data types for Riego
// Kept minimal and simple for Week 1 UI prototype

// Farmer profile info for the top bar
export interface FarmerProfile {
  name: string;
  initial: string;
}

// Today's single high-priority irrigation recommendation
export interface Advice {
  id: string;
  actionText: string; // e.g. "Water Field 1 at 6 AM for 30 minutes"
  fieldId: string;
  bestTime?: string;    // e.g. "6:00 - 6:30 AM"
  waterAmount?: string; // e.g. "1,200 L"
}


// One day of moisture readings for a field
export interface MoistureDataPoint {
  date: string;        // e.g. "Nov 9"
  moisture: number;    // 0–100 %
}

// 7-day history for a single field
export interface MoistureHistory {
  fieldId: string;
  data: MoistureDataPoint[];
}

// Target moisture band shown as a reference range on charts
export interface MoistureTarget {
  min: number;
  max: number;
}

// One upcoming irrigation event in today's schedule
export interface ScheduleItem {
  id: string;
  fieldId?: number | string; // Optional link to a registered field id
  time: string;            // e.g. "6:00 AM"
  fieldName: string;
  durationMinutes: number;
  done: boolean;
  doneAt?: string;         // e.g. "6:30 AM" or formatted completion timestamp
}

// Alert severity levels
export type AlertSeverity = "critical" | "warning" | "info";

// A single recent alert / notification
export interface Alert {
  id: string;
  severity: AlertSeverity;
  title: string;
  message?: string;          // one plain sentence description
  fieldName: string;
  timeLabel?: string;        // e.g. "Today, 10:45 AM"
  timeAgo?: string;          // e.g. "2h ago"
  recommendedAction: string; // one plain sentence
  isRead?: boolean;          // true = read, false = unread
}

// Dashboard summary numbers shown as stat tiles
export interface SummaryStats {
  averageMoisture: number;  // % average across all fields
  rainChance: number;       // % probability of rain today
  activeAlerts: number;     // count of current alerts
  sensorsOnline: number;
  sensorsTotal: number;
  // Optional breakdowns for rich desktop tiles
  criticalAlerts?: number;
  warningAlerts?: number;
  infoAlerts?: number;
  lowestMoistureField?: { name: string; moisture: number };
}

// Current weather snapshot
export interface Weather {
  temperature: number; // in Celsius, e.g. 32
  rainExpected: boolean; // true = Yes, false = No
  humidity: number; // percentage, e.g. 60
}

// Soil moisture condition category
export type MoistureStatus = "good" | "okay" | "dry";

// Sensor operational status
export type SensorStatus = "online" | "stale";

// Registered farm field
export interface Field {
  id: string;
  name: string; // e.g. "Field 1"
  crop: string; // e.g. "Wheat"
  moisturePercentage: number; // 0 to 100
  status: MoistureStatus;
  // Desktop extra details (Step 3)
  sensorStatus?: SensorStatus;
  lastReadingMinutes?: number; // e.g. 5
  nextWateringTime?: string;   // e.g. "6:00 AM"
  sownDate?: string;           // e.g. "2026-10-14"
  area?: string;               // e.g. "2.5 acres"
  growthStage?: string;        // e.g. "Vegetative, day 32"
  history?: MoistureDataPoint[];
}

// Option item with icon and descriptive hint
export interface FormOption {
  id: string;
  label: string;
  icon: string;
  hint?: string;
}

// Field registration form state across the 5 steps (SRS Section 4.4)
export interface FieldFormData {
  // Auto-filled fields
  id: string; // Auto-generated ID, e.g. "fld-104"
  farmerId: string; // Fixed farmer ID, e.g. "farmer-1"
  registrationDate: string; // e.g. "2026-11-10"
  growthStage?: string; // Auto-calculated e.g. "Vegetative"

  // Screen 1: Field basics
  nickname: string; // Optional nickname, e.g. "North field"
  location: string; // Required, e.g. "Current GPS: 13.0827° N, 77.5877° E"
  areaSize: number | ""; // Required number, e.g. 2.5
  areaUnit: "acres" | "guntas"; // Required unit

  // Screen 2: Crop
  cropName: string; // Required, e.g. "Wheat"
  sowingDate: string; // Required, e.g. "2026-10-15"
  notSownYet: boolean; // Flag if "Not sown yet" is selected

  // Screen 3: Soil and water
  soilType: string; // Required: "Sandy" | "Loamy" | "Clay"
  waterSource: string; // Required: "Borewell" | "Canal" | "Tank" | "Rain-fed only"
  irrigationMethod: string; // Required: "Drip" | "Sprinkler" | "Flood"
  pumpFlowRate: number | ""; // Optional flow rate (L/h)
  pumpFlowRateUnknown: boolean; // Flag if farmer clicked "I don't know"
  pump_hp?: number | null; // Optional pump horsepower
  pumpHp?: number | ""; // Optional pump horsepower in form state
  pumpHpUnknown?: boolean; // Flag if farmer clicked "I don't know" for HP

  // Screen 4: Sensor device
  hasSensor: boolean | null; // Required choice: true (Yes) or false (Not yet)
  deviceId: string; // Required if hasSensor is true
}

// Language choice option for farmer authentication and preferences
export interface LanguageOption {
  code: string; // "en" | "hi" | "kn"
  label: string; // "English" | "हिन्दी" | "ಕನ್ನಡ"
}

// Signup form state for Task 2 Step 5
export interface SignupFormData {
  name: string;
  phone: string;
  village: string;
  preferredLanguage: string; // "en" | "hi" | "kn"
}

// -------------------------------------------------------------
// Real backend telemetry and field schemas (FastAPI)
// -------------------------------------------------------------

// One raw reading returned by GET /sensor-readings/{field_id}/history
export interface SensorReading {
  time: string;              // ISO timestamp
  moisture_percent: number;
  raw_value: number;
  device_id: string;
}

// Full response from GET /sensor-readings/{field_id}/history
export interface SensorHistoryResponse {
  field_id: number;
  hours: number;
  count: number;
  readings: SensorReading[];
}

// Response from POST /fields/{field_id}/manual-reading
export interface ManualReadingResponse {
  field_id: number;
  moisture_percent: number;
  time: string;
  source: "manual";
}

// Real field record returned by GET /fields and POST /fields
export interface BackendField {
  id: number;
  farmer_id: string;
  nickname?: string | null;
  name?: string | null;
  latitude: number;
  longitude: number;
  area: number;
  area_unit: "acres" | "guntas" | string;
  crop: string;
  sowing_date?: string | null; // "YYYY-MM-DD"
  soil_type: string;
  water_source: string;
  irrigation_method: string;
  pump_flow_rate?: number | null;
  pump_hp?: number | null;
  pump_flow_source?: string | null;
  has_sensor: boolean;
  device_id?: string | null;
  registered_at: string;
  growth_stage: string;
}

// Request payload for creating a new field via POST /fields
export interface FieldCreateData {
  nickname?: string | null;
  latitude: number;
  longitude: number;
  area: number;
  area_unit: "acres" | "guntas" | string;
  crop: string;
  sowing_date?: string | null;
  soil_type: string;
  water_source: string;
  irrigation_method: string;
  pump_flow_rate?: number | null;
  pump_hp?: number | null;
  has_sensor: boolean;
  device_id?: string | null;
}

// Aggregate field conditions from GET /fields/{field_id}/conditions
export interface FieldConditions {
  field_id: number;
  nickname?: string | null;
  crop: string;
  days_since_sowing?: number | null;
  soil_moisture: {
    status: "good" | "okay" | "dry" | "stale" | "no_data" | string;
    message: string;
    moisture_percent?: number | null;
    level?: "dry" | "okay" | "good" | null;
    measured_at?: string | null;
    device_id?: string | null;
    source?: "sensor" | "manual" | string;
  };
  weather: {
    available: boolean;
    current?: any;
    forecast?: any[];
    rain_expected_soon?: boolean | null;
    rain_total_mm_next_2_days?: number | null;
    message?: string | null;
  };
  notes: string[];
}

// Single irrigation log entry returned by POST /irrigation-log and GET /fields/{field_id}/irrigation-log
export interface IrrigationLogEntry {
  id: number;
  field_id: number;
  started_at: string;
  duration_minutes: number;
  water_liters?: number | null;
  source: string;
  recommendation_id?: number | null;
  created_at: string;
}

// History response from GET /fields/{field_id}/irrigation-log
export interface IrrigationLogResponse {
  field_id: number;
  days: number;
  count: number;
  logs: IrrigationLogEntry[];
}

