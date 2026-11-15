// Data access functions
// Currently returns static sample data
// In later weeks, only these functions will be updated to fetch from FastAPI

import {
  addSampleField,
  MOISTURE_TARGET,
  sampleAdvice,
  sampleAlerts,
  sampleFarmer,
  sampleFields,
  sampleMoistureHistory,
  sampleSchedule,
  sampleWeather,
} from "./sampleData";
import {
  Advice,
  Alert,
  FarmerProfile,
  Field,
  FieldFormData,
  MoistureHistory,
  MoistureTarget,
  ScheduleItem,
  SummaryStats,
  Weather,
} from "./types";

// Get logged-in farmer profile
export async function getFarmerProfile(): Promise<FarmerProfile> {
  return sampleFarmer;
}

// Get today's primary irrigation advice
export async function getAdvice(): Promise<Advice> {
  return sampleAdvice;
}

// Get current weather near the farm
export async function getWeather(): Promise<Weather> {
  return sampleWeather;
}

// Get all registered fields for the farmer
export async function getFields(): Promise<Field[]> {
  return sampleFields;
}

// Register a new field (in-memory for UI prototype, will call FastAPI in later weeks)
export async function createField(formData: FieldFormData): Promise<Field> {
  return addSampleField(formData);
}

// Get 7-day moisture history for all fields, plus the target band
export async function getMoistureHistory(): Promise<{
  history: MoistureHistory[];
  target: MoistureTarget;
}> {
  return { history: sampleMoistureHistory, target: MOISTURE_TARGET };
}

// Get today's irrigation schedule in time order
export async function getTodaySchedule(): Promise<ScheduleItem[]> {
  return sampleSchedule;
}

// Get the most recent alerts, newest first
export async function getRecentAlerts(): Promise<Alert[]> {
  return sampleAlerts;
}

// Compute dashboard summary tiles from live data
export async function getSummaryStats(): Promise<SummaryStats> {
  const fields = await getFields();
  const alerts = await getRecentAlerts();

  // Average moisture across all fields
  const avg =
    fields.reduce((sum, f) => sum + f.moisturePercentage, 0) / fields.length;

  const lowestField = [...fields].sort(
    (a, b) => a.moisturePercentage - b.moisturePercentage
  )[0];

  return {
    averageMoisture: Math.round(avg),
    rainChance: 15,          // % — will come from weather API later
    activeAlerts: alerts.length,
    sensorsOnline: 2,
    sensorsTotal: 3,
    criticalAlerts: alerts.filter((a) => a.severity === "critical").length,
    warningAlerts: alerts.filter((a) => a.severity === "warning").length,
    infoAlerts: alerts.filter((a) => a.severity === "info").length,
    lowestMoistureField: lowestField
      ? { name: lowestField.name, moisture: lowestField.moisturePercentage }
      : undefined,
  };
}


