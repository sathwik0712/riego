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

