"""Synthetic training dataset generator for ML irrigation prediction.

Simulates hourly field telemetry, weather physics, soil water balance,
and precision irrigation decision labels matching backend/ml/DATASET.md.
"""

import argparse
import hashlib
import os
import sys
from datetime import date, datetime, timezone, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd

# Add parent backend directory to sys.path to reuse existing domain models
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from crop_targets import CROP_TARGET_MOISTURE, DEFAULT_TARGET_MOISTURE, get_target_range
from growth import CROP_GROWTH_STAGES, get_growth_stage
from pump import HP_TO_FLOW_LPH, DEFAULT_FLOW_LPH


# =========================================================================
# CONSTANTS & TUNING PARAMETERS (Approximate values for synthetic simulation)
# =========================================================================

# Crops and domain categories
CROPS = list(CROP_GROWTH_STAGES.keys())  # Wheat, Rice, Tomato, Maize, Cotton, Mustard, Sugarcane, Potato
SOIL_TYPES = ["Sandy", "Loamy", "Clay"]
WATER_SOURCES = ["Borewell", "Canal", "Tank", "Rain-fed"]
IRRIGATION_METHODS = ["Drip", "Sprinkler", "Flood"]

# Method irrigation efficiency (fraction of water reaching the root zone)
IRRIGATION_EFFICIENCY = {
    "Drip": 0.90,
    "Sprinkler": 0.75,
    "Flood": 0.55,
}

NOT_SOWN_TARGET_MOISTURE = (30.0, 50.0)

# Crop water consumption scale factor by developmental stage (relative evapotranspiration Kc)
STAGE_EVAPO_FACTOR = {
    "Not sown yet": 3.40,
    "Germination": 4.25,
    "Vegetative": 8.50,
    "Flowering": 10.60,
    "Maturity": 5.95,
}

# Soil drainage and retention characteristics
SOIL_DRAINAGE_RATE = {
    "Sandy": 0.080,  # Fast drainage
    "Loamy": 0.040,  # Medium drainage
    "Clay": 0.016,   # Slow drainage
}
SOIL_RAIN_RETENTION_FACTOR = {
    "Sandy": 0.22,   # % moisture gain per mm rain
    "Loamy": 0.28,
    "Clay": 0.35,
}
SOIL_FIELD_CAPACITY = {
    "Sandy": 50.0,
    "Loamy": 65.0,
    "Clay": 75.0,
}

# Conversion factor: % moisture gain per effective litre pumped per acre
LITRES_TO_MOISTURE_FACTOR = 0.0025

# Precision irrigation decision rule thresholds
FORECAST_RAIN_SKIP_THRESHOLD_MM = 5.0
MIN_IRRIGATION_DURATION = 10
MAX_IRRIGATION_DURATION = 180
DURATION_ROUNDING_MINUTES = 5

# Weather simulation base levels and cycles
SEASONAL_BASE_TEMP = 28.5       # Mean summer/monsoon temperature (°C)
DAILY_TEMP_AMPLITUDE = 6.0      # Daily temperature variation swing (+- °C)
COOL_TEMP_HOUR = 5.5            # Hour of coolest temperature (5:30 am)
PEAK_TEMP_HOUR = 14.5           # Hour of hottest temperature (2:30 pm)
BASE_HUMIDITY = 65.0            # Mean relative humidity (%)
BASE_WIND_SPEED = 2.5           # Mean wind speed (m/s)

# Monsoon rain simulation parameters
MONSOON_MONTHS = {6, 7, 8, 9}
MONSOON_RAIN_PROBABILITY = 0.020  # Hourly rain probability in monsoon
DRY_RAIN_PROBABILITY = 0.005     # Hourly rain probability outside monsoon
RAIN_CONTINUATION_PROB = 0.35    # Clustered event continuation chance
RAIN_INTENSITY_SHAPE = 1.8       # Gamma distribution shape
RAIN_INTENSITY_SCALE = 2.5       # Gamma distribution scale

# Sensor noise and missing data rates
SENSOR_NOISE_STD = 0.7           # Gaussian telemetry noise on sensor readings
SENSOR_DRIFT_MIN = -2.0          # Constant sensor calibration offset min
SENSOR_DRIFT_MAX = 2.0           # Constant sensor calibration offset max
SENSOR_DROP_RATE = 0.05          # 5% random dropped sensor readings
SENSOR_OUTAGE_COUNT_PER_FIELD = 2 # 2 multi-hour outages per field
SENSOR_OUTAGE_MIN_HOURS = 6
SENSOR_OUTAGE_MAX_HOURS = 24
MANUAL_READING_PROBABILITY = 0.04 # 4% rows are manual readings instead of sensor
WEATHER_MISSING_RATE = 0.01      # 1% missing weather entries

# Label noise rates (noisy ground-truth labels)
LABEL_NOISE_ONE_TO_ZERO = 0.08   # 8% of true irrigate_now=1 logged as 0 (forgot to tap Done)
LABEL_NOISE_ZERO_TO_ONE = 0.03   # 3% of true irrigate_now=0 logged as 1 (unprompted watering)

# Dataset columns in exact order matching DATASET.md and example_rows.csv
DATASET_COLUMNS = [
    "field_id",
    "timestamp_utc",
    "crop",
    "soil_type",
    "irrigation_method",
    "water_source",
    "area_acres",
    "pump_flow_rate_lph",
    "days_since_sowing",
    "growth_stage",
    "soil_moisture_pct",
    "moisture_change_6h",
    "moisture_change_24h",
    "reading_age_minutes",
    "moisture_source",
    "temperature_c",
    "humidity_percent",
    "wind_speed_ms",
    "rain_mm_last_hour",
    "rain_next_24h_mm",
    "rain_chance_next_24h_pct",
    "temp_max_next_24h_c",
    "hours_since_last_irrigation",
    "last_irrigation_minutes",
    "irrigation_minutes_last_7d",
    "irrigate_now",
    "irrigation_duration_minutes",
]


def simulate_field_weather(
    rng: np.random.Generator,
    start_dt: datetime,
    total_hours: int,
) -> Tuple[List[float], List[int], List[float], List[float]]:
    """
    Simulate hourly weather (temperature, humidity, wind, rain) for total_hours.
    Includes seasonal trends, day/night cycles, and clustered rainfall events.
    """
    temperatures: List[float] = []
    humidities: List[int] = []
    wind_speeds: List[float] = []
    rain_amounts: List[float] = []

    is_raining = False

    for h_idx in range(total_hours):
        dt = start_dt + timedelta(hours=h_idx)
        hour = dt.hour
        month = dt.month

        # Clustered rain simulation
        is_monsoon = month in MONSOON_MONTHS
        rain_prob = MONSOON_RAIN_PROBABILITY if is_monsoon else DRY_RAIN_PROBABILITY

        if is_raining:
            is_raining = bool(rng.random() < RAIN_CONTINUATION_PROB)
        else:
            is_raining = bool(rng.random() < rain_prob)

        if is_raining:
            rain_val = float(rng.gamma(RAIN_INTENSITY_SHAPE, RAIN_INTENSITY_SCALE))
            rain_mm = round(float(np.clip(rain_val, 0.2, 120.0)), 1)
        else:
            rain_mm = 0.0

        # Temperature: diurnal cycle + rain cooling + noise
        diurnal = -DAILY_TEMP_AMPLITUDE * np.cos(2.0 * np.pi * (hour - COOL_TEMP_HOUR) / 24.0)
        rain_cooling = min(4.5, rain_mm * 0.4) if rain_mm > 0 else 0.0
        temp = SEASONAL_BASE_TEMP + diurnal - rain_cooling + float(rng.normal(0, 0.6))
        temp = round(float(np.clip(temp, 10.0, 50.0)), 1)

        # Humidity: inverse to temperature + rain boost + noise
        hum = BASE_HUMIDITY - (temp - SEASONAL_BASE_TEMP) * 2.2 + (25.0 if rain_mm > 0 else 0.0) + float(rng.normal(0, 3.0))
        hum = int(np.clip(round(hum), 15, 98))

        # Wind speed
        wind = BASE_WIND_SPEED + float(rng.exponential(1.2))
        wind = round(float(np.clip(wind, 0.2, 30.0)), 1)

        temperatures.append(temp)
        humidities.append(hum)
        wind_speeds.append(wind)
        rain_amounts.append(rain_mm)

    return temperatures, humidities, wind_speeds, rain_amounts


def generate_synthetic_dataset(
    num_fields: int,
    num_days: int,
    seed: int,
    start_date_str: str,
) -> pd.DataFrame:
    """
    Generate synthetic multi-field hourly training data with realistic physics,
    weather forecasts, sensor telemetry with missingness, and labeled decisions.
    """
    rng = np.random.default_rng(seed)

    start_dt = datetime.strptime(start_date_str, "%Y-%m-%d").replace(tzinfo=timezone.utc)
    eval_hours = num_days * 24
    # Simulate an extra 25 hours to allow 24-hour lookahead forecast at every evaluation step
    sim_hours = eval_hours + 25

    flow_rate_options = list(HP_TO_FLOW_LPH.values())  # [5000, 9000, 18000, 27000, 45000]

    all_rows: List[Dict[str, Any]] = []

    # Internal diagnostic tracking counters (column-free)
    total_eval_steps = 0
    total_true_irrigate = 0
    total_logged_irrigate = 0
    total_flipped_positives = 0
    monthly_steps: Dict[int, int] = {m: 0 for m in range(1, 13)}
    monthly_true_irrigate: Dict[int, int] = {m: 0 for m in range(1, 13)}

    for field_idx in range(1, num_fields + 1):
        field_id = field_idx

        # Static field registration attributes
        crop = str(rng.choice(CROPS))
        soil_type = str(rng.choice(SOIL_TYPES))
        irrigation_method = str(rng.choice(IRRIGATION_METHODS))
        water_source = str(rng.choice(WATER_SOURCES))
        area_acres = round(float(rng.choice([0.8, 1.0, 1.5, 2.0, 2.5, 3.0, 4.0, 5.0])), 1)

        # 90% fields have pump flow rate, 10% null; Rain-fed fields never have a pump
        if water_source == "Rain-fed":
            pump_flow_rate_lph = None
        else:
            has_flow_rate = rng.random() < 0.90
            pump_flow_rate_lph = float(rng.choice(flow_rate_options)) if has_flow_rate else None

        # Sowing date on or before start_date (or 5% null for 'Not sown yet')
        if rng.random() < 0.95:
            days_before_start = int(rng.integers(0, 35))
            sowing_date = (start_dt - timedelta(days=days_before_start)).date()
        else:
            sowing_date = None

        # Field sensor characteristics
        field_drift = float(rng.uniform(SENSOR_DRIFT_MIN, SENSOR_DRIFT_MAX))

        # Outage windows for this field (sensor completely drops readings)
        outages: List[Tuple[int, int]] = []
        for _ in range(SENSOR_OUTAGE_COUNT_PER_FIELD):
            if eval_hours > 30:
                outage_start = int(rng.integers(10, eval_hours - 25))
                outage_len = int(rng.integers(SENSOR_OUTAGE_MIN_HOURS, SENSOR_OUTAGE_MAX_HOURS + 1))
                outages.append((outage_start, outage_start + outage_len))

        # Weather for this field location
        temps, hums, winds, rains = simulate_field_weather(rng, start_dt, sim_hours)

        # Moisture simulation state
        # Initialize near target range midpoint
        initial_targets = CROP_TARGET_MOISTURE.get(crop, {}).get("Vegetative", DEFAULT_TARGET_MOISTURE)
        true_moisture = float(rng.uniform(initial_targets[0] + 5.0, initial_targets[1] - 5.0))

        # Tracking state
        pending_irrigation_duration: int = 0
        completed_irrigations: List[Tuple[datetime, datetime, int]] = []
        hourly_sensor_history: List[Optional[float]] = []
        last_reading_time: Optional[datetime] = None

        # Simulate hour by hour
        for h in range(eval_hours):
            current_dt = start_dt + timedelta(hours=h)

            # 1. Apply scheduled irrigation from previous hour decision (simulated physics)
            if pending_irrigation_duration > 0:
                flow = pump_flow_rate_lph if pump_flow_rate_lph else DEFAULT_FLOW_LPH
                gross_litres = (pending_irrigation_duration / 60.0) * flow
                eff = IRRIGATION_EFFICIENCY[irrigation_method]
                effective_litres = gross_litres * eff
                gain_pct = (effective_litres / area_acres) * LITRES_TO_MOISTURE_FACTOR
                true_moisture += gain_pct

                irr_start = current_dt - timedelta(hours=1)
                irr_end = irr_start + timedelta(minutes=pending_irrigation_duration)
                completed_irrigations.append((irr_start, irr_end, pending_irrigation_duration))
                pending_irrigation_duration = 0

            # 2. Weather at current hour
            cur_temp = temps[h]
            cur_hum = hums[h]
            cur_wind = winds[h]
            cur_rain = rains[h]

            # 3. Crop developmental stage
            if sowing_date is not None:
                days_since_sowing: Optional[int] = (current_dt.date() - sowing_date).days
                if days_since_sowing < 0:
                    growth_stage = "Not sown yet"
                else:
                    # Provide an effective sowing date relative to date.today() so that
                    # growth.get_growth_stage computes (date.today() - ref_sowing).days == days_since_sowing
                    ref_sowing = date.today() - timedelta(days=days_since_sowing)
                    growth_stage = get_growth_stage(ref_sowing, crop)
            else:
                days_since_sowing = None
                growth_stage = "Not sown yet"

            # 4. Soil water balance decay (rain gain, evaporation, drainage)
            rain_gain = cur_rain * SOIL_RAIN_RETENTION_FACTOR[soil_type]
            et0 = max(0.04, 0.007 * (cur_temp - 8.0) * (1.0 - cur_hum / 120.0))
            evap_loss = et0 * STAGE_EVAPO_FACTOR.get(growth_stage, 1.0)

            field_cap = SOIL_FIELD_CAPACITY[soil_type]
            excess_moisture = max(0.0, true_moisture - field_cap)
            drain_loss = excess_moisture * SOIL_DRAINAGE_RATE[soil_type] * 3.0 + true_moisture * SOIL_DRAINAGE_RATE[soil_type] * 0.1

            true_moisture = float(np.clip(true_moisture + rain_gain - evap_loss - drain_loss, 5.0, 95.0))

            # 5. Future 24h weather forecast (with realistic forecast error, no leakage)
            future_rains = rains[h + 1 : h + 25]
            future_rain_sum = float(sum(future_rains))
            forecast_error_ratio = float(rng.uniform(0.85, 1.15))
            rain_forecast = max(0.0, round(future_rain_sum * forecast_error_ratio + (float(rng.normal(0, 0.3)) if future_rain_sum > 0 else (0.5 if rng.random() < 0.04 else 0.0)), 1))
            rain_next_24h_mm = float(np.clip(rain_forecast, 0.0, 350.0))

            if rain_next_24h_mm >= 20.0:
                rain_chance_next_24h_pct = int(rng.integers(75, 98))
            elif rain_next_24h_mm >= 8.0:
                rain_chance_next_24h_pct = int(rng.integers(50, 85))
            elif rain_next_24h_mm >= 2.0:
                rain_chance_next_24h_pct = int(rng.integers(30, 60))
            elif rain_next_24h_mm > 0.0:
                rain_chance_next_24h_pct = int(rng.integers(15, 35))
            else:
                rain_chance_next_24h_pct = int(rng.integers(0, 15))

            future_temps = temps[h + 1 : h + 25]
            temp_max_next_24h_c = round(float(max(future_temps) + rng.normal(0, 0.6)), 1)
            temp_max_next_24h_c = float(np.clip(temp_max_next_24h_c, -5.0, 55.0))

            # 6. Agronomic Decision Rule (Ground Truth Targets)
            if growth_stage != "Not sown yet":
                target_low, target_high = CROP_TARGET_MOISTURE.get(crop, {}).get(growth_stage, DEFAULT_TARGET_MOISTURE)
            else:
                target_low, target_high = NOT_SOWN_TARGET_MOISTURE

            # Irrigate if true moisture is below stage threshold AND no significant rain forecast
            if true_moisture < target_low and rain_next_24h_mm < FORECAST_RAIN_SKIP_THRESHOLD_MM:
                true_irrigate_now = 1
                target_mid = (target_low + target_high) / 2.0
                deficit = max(4.0, target_mid - true_moisture)
                needed_effective = (deficit / LITRES_TO_MOISTURE_FACTOR) * area_acres
                needed_gross = needed_effective / IRRIGATION_EFFICIENCY[irrigation_method]
                flow = pump_flow_rate_lph if pump_flow_rate_lph else DEFAULT_FLOW_LPH
                calc_minutes = needed_gross / (flow / 60.0)
                true_duration = int(round(calc_minutes / DURATION_ROUNDING_MINUTES) * DURATION_ROUNDING_MINUTES)
                true_duration = int(np.clip(true_duration, MIN_IRRIGATION_DURATION, MAX_IRRIGATION_DURATION))
            else:
                true_irrigate_now = 0
                true_duration = 0

            # Schedule physical irrigation for next hour
            if true_irrigate_now == 1:
                pending_irrigation_duration = true_duration

            # 7. Water History Features
            past_irrs = [irr for irr in completed_irrigations if irr[1] <= current_dt]
            if len(past_irrs) > 0:
                last_irr = past_irrs[-1]
                hours_since = (current_dt - last_irr[1]).total_seconds() / 3600.0
                hours_since_last_irrigation: Optional[float] = round(float(np.clip(hours_since, 0.0, 720.0)), 1)
                last_irrigation_minutes: Optional[int] = int(last_irr[2])

                cutoff_7d = current_dt - timedelta(days=7)
                recent_7d = [irr for irr in past_irrs if irr[0] >= cutoff_7d]
                irrigation_minutes_last_7d: Optional[int] = int(sum(irr[2] for irr in recent_7d))
            else:
                hours_since_last_irrigation = None
                last_irrigation_minutes = None
                irrigation_minutes_last_7d = None

            # 8. Sensor Telemetry with Noise, Outages, and Missing Values
            in_outage = any(start <= h <= end for start, end in outages)
            is_dropped = rng.random() < SENSOR_DROP_RATE

            if in_outage or is_dropped:
                reading_available = False
            else:
                reading_available = True

            if reading_available:
                noise = float(rng.normal(0, SENSOR_NOISE_STD))
                reading_val = round(float(np.clip(true_moisture + field_drift + noise, 0.0, 100.0)), 1)
                last_reading_time = current_dt - timedelta(minutes=int(rng.integers(4, 15)))
                moisture_source: Optional[str] = "manual" if rng.random() < MANUAL_READING_PROBABILITY else "sensor"
            else:
                reading_val = None
                moisture_source = None

            hourly_sensor_history.append(reading_val)
            soil_moisture_pct = reading_val

            if last_reading_time is not None:
                age_min = (current_dt - last_reading_time).total_seconds() / 60.0
                reading_age_minutes: Optional[float] = round(float(np.clip(age_min, 0.0, 43200.0)), 1)
            else:
                reading_age_minutes = None

            # 6-hour and 24-hour moisture changes
            if soil_moisture_pct is not None:
                if h >= 6 and hourly_sensor_history[h - 6] is not None:
                    chg_6 = soil_moisture_pct - hourly_sensor_history[h - 6]  # type: ignore
                    moisture_change_6h: Optional[float] = round(float(np.clip(chg_6, -50.0, 50.0)), 1)
                else:
                    moisture_change_6h = None

                if h >= 24 and hourly_sensor_history[h - 24] is not None:
                    chg_24 = soil_moisture_pct - hourly_sensor_history[h - 24]  # type: ignore
                    moisture_change_24h: Optional[float] = round(float(np.clip(chg_24, -70.0, 70.0)), 1)
                else:
                    moisture_change_24h = None
            else:
                moisture_change_6h = None
                moisture_change_24h = None

            # 9. Weather Telemetry Missing Values (~1% rate)
            row_temp: Optional[float] = cur_temp if rng.random() >= WEATHER_MISSING_RATE else None
            row_hum: Optional[int] = cur_hum if rng.random() >= WEATHER_MISSING_RATE else None
            row_wind: Optional[float] = cur_wind if rng.random() >= WEATHER_MISSING_RATE else None
            row_rain: Optional[float] = cur_rain if rng.random() >= WEATHER_MISSING_RATE else None

            # 10. Noisy Ground-Truth Labels (Farmer Logging Delay/Omission)
            total_eval_steps += 1
            curr_month = current_dt.month
            monthly_steps[curr_month] += 1
            if true_irrigate_now == 1:
                total_true_irrigate += 1
                monthly_true_irrigate[curr_month] += 1
                if rng.random() < LABEL_NOISE_ONE_TO_ZERO:
                    # Farmer forgot to tap Done -> logged as 0
                    logged_irrigate_now = 0
                    logged_duration = 0
                else:
                    logged_irrigate_now = 1
                    logged_duration = true_duration
            else:
                if rng.random() < LABEL_NOISE_ZERO_TO_ONE:
                    # Unprompted extra watering
                    logged_irrigate_now = 1
                    logged_duration = int(rng.choice([15, 20, 30, 45, 60]))
                    total_flipped_positives += 1
                else:
                    logged_irrigate_now = 0
                    logged_duration = 0

            if logged_irrigate_now == 1:
                total_logged_irrigate += 1

            # Construct row dictionary
            row: Dict[str, Any] = {
                "field_id": field_id,
                "timestamp_utc": current_dt.strftime("%Y-%m-%dT%H:%M:%SZ"),
                "crop": crop,
                "soil_type": soil_type,
                "irrigation_method": irrigation_method,
                "water_source": water_source,
                "area_acres": area_acres,
                "pump_flow_rate_lph": pump_flow_rate_lph,
                "days_since_sowing": days_since_sowing,
                "growth_stage": growth_stage,
                "soil_moisture_pct": soil_moisture_pct,
                "moisture_change_6h": moisture_change_6h,
                "moisture_change_24h": moisture_change_24h,
                "reading_age_minutes": reading_age_minutes,
                "moisture_source": moisture_source,
                "temperature_c": row_temp,
                "humidity_percent": row_hum,
                "wind_speed_ms": row_wind,
                "rain_mm_last_hour": row_rain,
                "rain_next_24h_mm": rain_next_24h_mm,
                "rain_chance_next_24h_pct": rain_chance_next_24h_pct,
                "temp_max_next_24h_c": temp_max_next_24h_c,
                "hours_since_last_irrigation": hours_since_last_irrigation,
                "last_irrigation_minutes": last_irrigation_minutes,
                "irrigation_minutes_last_7d": irrigation_minutes_last_7d,
                "irrigate_now": logged_irrigate_now,
                "irrigation_duration_minutes": logged_duration,
            }
            all_rows.append(row)

    df = pd.DataFrame(all_rows, columns=DATASET_COLUMNS)

    # Convert integer columns with potential missing values to nullable integer dtype (Int64)
    # This prevents pandas from exporting integers with decimal .0 in CSV
    nullable_int_cols = [
        "field_id",
        "days_since_sowing",
        "humidity_percent",
        "rain_chance_next_24h_pct",
        "last_irrigation_minutes",
        "irrigation_minutes_last_7d",
        "irrigate_now",
        "irrigation_duration_minutes",
    ]
    for col in nullable_int_cols:
        df[col] = df[col].astype("Int64")

    # Diagnostic logging (column-free)
    true_share = total_true_irrigate / total_eval_steps if total_eval_steps > 0 else 0.0
    logged_share = total_logged_irrigate / total_eval_steps if total_eval_steps > 0 else 0.0
    flipped_share = total_flipped_positives / total_logged_irrigate if total_logged_irrigate > 0 else 0.0
    valid_moisture = df["soil_moisture_pct"].dropna()
    m_mean = float(valid_moisture.mean())
    p5, p50, p95 = np.percentile(valid_moisture, [5, 50, 95])

    print("Generation Diagnostics:")
    print(f"  Soil moisture (%): mean={m_mean:.2f}, 5th={p5:.2f}, 50th={p50:.2f}, 95th={p95:.2f}")
    print(f"  True decision == 1 share: {true_share:.4f} ({true_share*100:.2f}%) [{total_true_irrigate:,}/{total_eval_steps:,}]")
    print(f"  Logged decision == 1 share: {logged_share:.4f} ({logged_share*100:.2f}%) [{total_logged_irrigate:,}/{total_eval_steps:,}]")
    print(f"  Logged positives from flipped labels: {flipped_share:.4f} ({flipped_share*100:.2f}%) [{total_flipped_positives:,}/{total_logged_irrigate:,}]")
    print("Monthly Diagnostics (Rows and True Irrigate Share):")
    for m in range(1, 13):
        m_rows = monthly_steps[m]
        m_true = monthly_true_irrigate[m]
        m_pct = (m_true / m_rows * 100.0) if m_rows > 0 else 0.0
        print(f"  Month {m:02d}: {m_rows:,} rows | True Irrigate: {m_true:,} ({m_pct:.2f}%)")

    return df


def compute_file_hash(filepath: str) -> str:
    """Compute SHA-256 hash of a file to verify reproducibility."""
    hasher = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            hasher.update(chunk)
    return hasher.hexdigest()


def main():
    parser = argparse.ArgumentParser(description="Generate synthetic irrigation ML dataset.")
    parser.add_argument("--fields", type=int, default=100, help="Number of virtual fields (default: 100)")
    parser.add_argument("--days", type=int, default=365, help="Number of days to simulate (default: 365)")
    parser.add_argument("--seed", type=int, default=42, help="Random seed for reproducibility (default: 42)")
    parser.add_argument("--start-date", type=str, default="2026-01-01", help="Simulation start date YYYY-MM-DD (default: 2026-01-01)")
    parser.add_argument("--out", type=str, default="backend/ml/data/synthetic_training.csv", help="Output CSV path")

    args = parser.parse_args()

    print(f"Generating synthetic dataset: fields={args.fields}, days={args.days}, seed={args.seed}, start_date={args.start_date}...")
    df = generate_synthetic_dataset(
        num_fields=args.fields,
        num_days=args.days,
        seed=args.seed,
        start_date_str=args.start_date,
    )

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    df.to_csv(out_path, index=False)
    print(f"Dataset successfully saved to: {out_path} ({len(df):,} rows)")


if __name__ == "__main__":
    main()
