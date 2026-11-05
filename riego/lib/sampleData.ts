// Static sample data for Week 1 UI prototype
// This data will be replaced by FastAPI backend calls in later weeks

import { Advice, FarmerProfile, Field, Weather } from "./types";

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

