// Data access functions
// Currently returns static sample data
// In later weeks, only these functions will be updated to fetch from FastAPI

import {
  addSampleField,
  sampleAdvice,
  sampleFarmer,
  sampleFields,
  sampleWeather,
} from "./sampleData";
import { Advice, FarmerProfile, Field, FieldFormData, Weather } from "./types";

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


