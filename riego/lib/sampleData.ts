// Static sample data for Week 1 UI prototype
// This data will be replaced by FastAPI backend calls in later weeks

import {
  Advice,
  Alert,
  FarmerProfile,
  Field,
  FieldFormData,
  FormOption,
  LanguageOption,
  MoistureHistory,
  MoistureTarget,
  ScheduleItem,
  Weather,
} from "./types";

// Supported languages for signup & user preferences
export const languageOptions: LanguageOption[] = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिन्दी" },
  { code: "kn", label: "ಕನ್ನಡ" },
];

export const sampleFarmer: FarmerProfile = {
  name: "Ramesh Kumar",
  initial: "R",
};

export const sampleAdvice: Advice = {
  id: "adv-1",
  actionText: "Water Field 1 at 6 AM for 30 minutes",
  fieldId: "fld-1",
  bestTime: "6:00 - 6:30 AM",
  waterAmount: "1,200 L",
};

export const sampleWeather: Weather = {
  temperature: 32,
  rainExpected: false,
  humidity: 60,
};

// ── Moisture history ────────────────────────────────────────────────────────

// Target band displayed on moisture charts
export const MOISTURE_TARGET: MoistureTarget = { min: 40, max: 70 };

// 7-day daily moisture % for each field.
// Values drift down (soil drying) and jump up after an irrigation event.
export const sampleMoistureHistory: MoistureHistory[] = [
  {
    fieldId: "fld-1",
    data: [
      { date: "Nov 9",  moisture: 72 },
      { date: "Nov 10", moisture: 65 }, // irrigated → jumped
      { date: "Nov 11", moisture: 59 },
      { date: "Nov 12", moisture: 52 },
      { date: "Nov 13", moisture: 68 }, // irrigated → jumped
      { date: "Nov 14", moisture: 61 },
      { date: "Nov 15", moisture: 55 },
    ],
  },
  {
    fieldId: "fld-2",
    data: [
      { date: "Nov 9",  moisture: 45 },
      { date: "Nov 10", moisture: 38 },
      { date: "Nov 11", moisture: 62 }, // irrigated → jumped
      { date: "Nov 12", moisture: 54 },
      { date: "Nov 13", moisture: 44 },
      { date: "Nov 14", moisture: 33 },
      { date: "Nov 15", moisture: 20 }, // dry — matches current status
    ],
  },
  {
    fieldId: "fld-3",
    data: [
      { date: "Nov 9",  moisture: 55 },
      { date: "Nov 10", moisture: 48 },
      { date: "Nov 11", moisture: 41 },
      { date: "Nov 12", moisture: 65 }, // irrigated → jumped
      { date: "Nov 13", moisture: 58 },
      { date: "Nov 14", moisture: 52 },
      { date: "Nov 15", moisture: 48 }, // okay — matches current status
    ],
  },
];

// Helper: Calculate crop growth stage based on sowing date (matches backend/growth.py)
export function calculateGrowthStageWithDays(sowingDateStr?: string): string {
  if (!sowingDateStr) return "Not sown yet";
  const sowing = new Date(sowingDateStr);
  const today = new Date("2026-11-15");
  const diffDays = Math.floor((today.getTime() - sowing.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return "Not sown yet";
  let stage = "Maturity";
  if (diffDays <= 14) stage = "Germination";
  else if (diffDays <= 45) stage = "Vegetative";
  else if (diffDays <= 75) stage = "Flowering";
  return `${stage} · day ${diffDays}`;
}

export const sampleFields: Field[] = [
  {
    id: "fld-1",
    name: "Field 1",
    crop: "Wheat",
    moisturePercentage: 80,
    status: "good",
    sensorStatus: "online",
    lastReadingMinutes: 5,
    nextWateringTime: "6:00 AM",
    sownDate: "2026-10-14",
    area: "2.5 acres",
    growthStage: calculateGrowthStageWithDays("2026-10-14"), // "Vegetative, day 32"
    history: sampleMoistureHistory[0].data,
  },
  {
    id: "fld-2",
    name: "Field 2",
    crop: "Rice",
    moisturePercentage: 20,
    status: "dry",
    sensorStatus: "stale", // Stale chip shows here
    lastReadingMinutes: 45,
    nextWateringTime: "5:00 PM",
    sownDate: "2026-09-20",
    area: "1.8 acres",
    growthStage: calculateGrowthStageWithDays("2026-09-20"), // "Flowering, day 56"
    history: sampleMoistureHistory[1].data,
  },
  {
    id: "fld-3",
    name: "Field 3",
    crop: "Mustard",
    moisturePercentage: 48,
    status: "okay",
    sensorStatus: "online",
    lastReadingMinutes: 12,
    nextWateringTime: "9:30 AM",
    sownDate: "2026-11-02",
    area: "3.0 acres",
    growthStage: calculateGrowthStageWithDays("2026-11-02"), // "Germination, day 13"
    history: sampleMoistureHistory[2].data,
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

// Pump horsepower options for Screen 3
export interface PumpHpOption {
  value: number;
  label: string;
}

export const pumpHpOptions: PumpHpOption[] = [
  { value: 0.5, label: "0.5 HP" },
  { value: 1, label: "1 HP" },
  { value: 2, label: "2 HP" },
  { value: 3, label: "3 HP" },
  { value: 5, label: "5 HP" },
];

// Initial blank form data for a new field registration
export const initialFieldFormData: FieldFormData = {
  id: "fld-104",
  farmerId: "farmer-1",
  registrationDate: "2026-11-10",
  growthStage: "Vegetative",
  nickname: "",
  location: "",
  latitude: null,
  longitude: null,
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
  pumpHp: "",
  pumpHpUnknown: false,
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
    sensorStatus: formData.hasSensor ? "online" : undefined,
    lastReadingMinutes: 0,
    nextWateringTime: "6:00 AM",
    sownDate: formData.sowingDate || "2026-11-10",
    area: formData.areaSize ? `${formData.areaSize} ${formData.areaUnit}` : "2.5 acres",
    growthStage: calculateGrowthStageWithDays(formData.sowingDate),
    history: [
      { date: "Nov 9",  moisture: 60 },
      { date: "Nov 10", moisture: 62 },
      { date: "Nov 11", moisture: 63 },
      { date: "Nov 12", moisture: 64 },
      { date: "Nov 13", moisture: 63 },
      { date: "Nov 14", moisture: 65 },
      { date: "Nov 15", moisture: 65 },
    ],
  };
  sampleFields.push(newField);
  return newField;
}

// ── Today's schedule ────────────────────────────────────────────────────────

export const sampleSchedule: ScheduleItem[] = [
  { id: "sch-1", fieldId: 1, time: "6:00 AM",  fieldName: "Field 1", durationMinutes: 30, done: false },
  { id: "sch-2", fieldId: 3, time: "9:30 AM",  fieldName: "Field 3", durationMinutes: 20, done: false },
  { id: "sch-3", fieldId: 2, time: "5:00 PM",  fieldName: "Field 2", durationMinutes: 45, done: false },
];

// ── Recent alerts ───────────────────────────────────────────────────────────

export const sampleAlerts: Alert[] = [
  {
    id: "alt-1",
    severity: "critical",
    title: "Sensor offline",
    message: "Soil moisture sensor on Field 2 stopped sending telemetry.",
    fieldName: "Field 2",
    timeLabel: "Today, 10:45 AM",
    timeAgo: "2h ago",
    recommendedAction: "Check battery connection and power switch on the ESP32 sensor unit.",
    isRead: false,
  },
  {
    id: "alt-2",
    severity: "warning",
    title: "Low soil moisture",
    message: "Moisture in Field 1 dropped to 38%, below the optimal target band.",
    fieldName: "Field 1",
    timeLabel: "Today, 8:15 AM",
    timeAgo: "5h ago",
    recommendedAction: "Schedule a 30-minute drip irrigation cycle before midday heat.",
    isRead: false,
  },
  {
    id: "alt-3",
    severity: "warning",
    title: "Rain expected",
    message: "Heavy rainfall forecast nearby within the next 24 hours.",
    fieldName: "Field 3",
    timeLabel: "Yesterday, 4:30 PM",
    timeAgo: "1d ago",
    recommendedAction: "Pause automated pump irrigation to prevent root waterlogging.",
    isRead: true,
  },
  {
    id: "alt-4",
    severity: "info",
    title: "Water saving milestone",
    message: "Smart scheduling saved 2,400 litres of water this week across all fields.",
    fieldName: "All fields",
    timeLabel: "Yesterday, 9:00 AM",
    timeAgo: "1d ago",
    recommendedAction: "Continue following the AI watering windows to maximize water conservation.",
    isRead: true,
  },
];

