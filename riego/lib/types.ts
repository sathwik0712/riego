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
}

// Current weather snapshot
export interface Weather {
  temperature: number; // in Celsius, e.g. 32
  rainExpected: boolean; // true = Yes, false = No
  humidity: number; // percentage, e.g. 60
}

// Soil moisture condition category
export type MoistureStatus = "good" | "okay" | "dry";

// Registered farm field
export interface Field {
  id: string;
  name: string; // e.g. "Field 1"
  crop: string; // e.g. "Wheat"
  moisturePercentage: number; // 0 to 100
  status: MoistureStatus;
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
  pumpFlowRate: number | ""; // Optional flow rate
  pumpFlowRateUnknown: boolean; // Flag if farmer clicked "I don't know"

  // Screen 4: Sensor device
  hasSensor: boolean | null; // Required choice: true (Yes) or false (Not yet)
  deviceId: string; // Required if hasSensor is true
}


