// Static sample data for Week 1 UI prototype
// This data will be replaced by FastAPI backend calls in later weeks

import {
  Advice,
  FarmerProfile,
  Field,
  FieldFormData,
  FormOption,
  Weather,
} from "./types";

export const sampleFarmer: FarmerProfile = {
  name: "Ramesh Kumar",
  initial: "R",
};

export const sampleAdvice: Advice = {
  id: "adv-1",
  actionText: "Water Field 1 at 6 AM for 30 minutes",
  fieldId: "fld-1",
};

export const sampleWeather: Weather = {
  temperature: 32,
  rainExpected: false,
  humidity: 60,
};

export const sampleFields: Field[] = [
  {
    id: "fld-1",
    name: "Field 1",
    crop: "Wheat",
    moisturePercentage: 80,
    status: "good",
  },
  {
    id: "fld-2",
    name: "Field 2",
    crop: "Rice",
    moisturePercentage: 20,
    status: "dry",
  },
  {
    id: "fld-3",
    name: "Field 3",
    crop: "Mustard",
    moisturePercentage: 48,
    status: "okay",
  },
];

// Crop selection list for Screen 2
export const cropOptions: FormOption[] = [
  { id: "wheat", label: "Wheat", icon: "🌾", hint: "Rabi cereal crop" },
  { id: "rice", label: "Rice (Paddy)", icon: "🌾", hint: "High water requirement" },
  { id: "tomato", label: "Tomato", icon: "🍅", hint: "Sensitive to moisture" },
  { id: "maize", label: "Maize (Corn)", icon: "🌽", hint: "Moderate water need" },
  { id: "cotton", label: "Cotton", icon: "🌱", hint: "Deep roots, dry climate" },
  { id: "mustard", label: "Mustard", icon: "🌼", hint: "Low water need" },
  { id: "sugarcane", label: "Sugarcane", icon: "🎋", hint: "Long duration crop" },
  { id: "potato", label: "Potato", icon: "🥔", hint: "Shallow root system" },
];

// Soil type options for Screen 3
export const soilTypeOptions: FormOption[] = [
  { id: "Sandy", label: "Sandy", icon: "🏖️", hint: "Light texture, drains water fast" },
  { id: "Loamy", label: "Loamy", icon: "🌱", hint: "Balanced mix, retains moisture well" },
  { id: "Clay", label: "Clay", icon: "🧱", hint: "Heavy texture, holds water for long" },
];

// Water source options for Screen 3
export const waterSourceOptions: FormOption[] = [
  { id: "Borewell", label: "Borewell", icon: "🚰", hint: "Groundwater tube well / borewell" },
  { id: "Canal", label: "Canal", icon: "🌊", hint: "Government or village canal supply" },
  { id: "Tank", label: "Tank / Pond", icon: "💧", hint: "Farm pond, lake, or open storage" },
  { id: "Rain-fed only", label: "Rain-fed only", icon: "🌧️", hint: "Dependent entirely on monsoon rains" },
];

// Irrigation method options for Screen 3
export const irrigationMethodOptions: FormOption[] = [
  { id: "Drip", label: "Drip", icon: "💧", hint: "Efficient pipe drippers near roots" },
  { id: "Sprinkler", label: "Sprinkler", icon: "🚿", hint: "Overhead spray coverage" },
  { id: "Flood", label: "Flood", icon: "🌊", hint: "Surface canal / furrow flooding" },
];

// Land area unit options for Screen 1
export const areaUnitOptions: FormOption[] = [
  { id: "acres", label: "Acres", icon: "🌾", hint: "Standard acre (43,560 sq ft)" },
  { id: "guntas", label: "Guntas", icon: "📐", hint: "1 Gunta = 1/40th of an Acre" },
];

// Initial blank form data for a new field registration
export const initialFieldFormData: FieldFormData = {
  id: "fld-104",
  farmerId: "farmer-1",
  registrationDate: "2026-11-10",
  growthStage: "Vegetative",
  nickname: "",
  location: "",
  areaSize: "",
  areaUnit: "acres",
  cropName: "",
  sowingDate: "",
  notSownYet: false,
  soilType: "",
  waterSource: "",
  irrigationMethod: "",
  pumpFlowRate: "",
  pumpFlowRateUnknown: false,
  hasSensor: null,
  deviceId: "",
};

// Add a newly registered field to the in-memory sample fields list
export function addSampleField(formData: FieldFormData): Field {
  const newField: Field = {
    id: formData.id || `fld-${sampleFields.length + 1}`,
    name: formData.nickname.trim()
      ? formData.nickname
      : `Field ${sampleFields.length + 1}`,
    crop: formData.cropName || "Wheat",
    moisturePercentage: 65,
    status: "good",
  };
  sampleFields.push(newField);
  return newField;
}



