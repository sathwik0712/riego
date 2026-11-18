# Training Dataset Specification for ML Irrigation Prediction

## 1. Purpose and Row Definition

This dataset provides structured historical and real-time agricultural telemetry to train machine learning models for precision irrigation scheduling. The models predict when a field requires watering and the optimal duration in minutes to prevent crop water stress and avoid water wastage.

**Row definition:** One row represents exactly one field at one hourly decision time (e.g. 2026-11-17 06:00:00 UTC). Hourly evaluations allow the system to adapt recommendations dynamically to changing soil moisture and weather conditions.

> Note: The accompanying `example_rows.csv` contains synthetic example rows created for illustrative testing; they are made up and not real field data.

---

## 2. Dataset Columns

The dataset consists of 27 columns arranged into identifiers, features grouped by data source, and target variables.

| Column Name | Type | Unit | Allowed Range / Values | Source | Meaning |
|---|---|---|---|---|---|
| **Identifiers** | | | | | |
| `field_id` | integer | — | 1 to 1,000,000 | Field registration | Unique identifier of the agricultural field. |
| `timestamp_utc` | string (ISO-8601) | — | UTC timestamp (YYYY-MM-DDTHH:MM:SSZ) | Derived | Decision timestamp representing the evaluation hour. |
| **Field Registration** | | | | | |
| `crop` | string | — | "Wheat", "Rice (Paddy)", "Tomato", "Maize (Corn)", "Cotton", "Mustard", "Sugarcane", "Potato", or other registered crop | Field registration | Name of the cultivated crop on the field. |
| `soil_type` | string | — | "Sandy", "Loamy", "Clay" | Field registration | Soil texture class defining field capacity and drainage rate. |
| `irrigation_method` | string | — | "Drip", "Sprinkler", "Flood" | Field registration | Method used to deliver water to the crop. |
| `water_source` | string | — | "Borewell", "Canal", "Tank", "Rain-fed" | Field registration | Primary source supplying water to the field. |
| `area_acres` | float | acres | > 0.0 to 1000.0 | Derived (Field registration) | Field size in acres. Converted from guntas where `1 acre = 40 guntas` (`area_acres = area_guntas / 40.0`). |
| `pump_flow_rate_lph` | float | L/h | 100.0 to 100,000.0 (or empty/null) | Field registration | Water delivery rate of the pump in litres per hour. |
| **Crop Stage** | | | | | |
| `days_since_sowing` | integer | days | 0 to 365 (or empty/null) | Derived (Field registration) | Days elapsed from `sowing_date` to decision time (`today - sowing_date`). Null if not sown. |
| `growth_stage` | string | — | "Germination", "Vegetative", "Flowering", "Maturity", "Not sown yet" | Derived (`backend/growth.py`) | Crop developmental phase: Germination (0–14 days), Vegetative (15–45 days), Flowering (46–75 days), Maturity (>75 days), or Not sown yet (null or negative days). |
| **Soil Moisture** | | | | | |
| `soil_moisture_pct` | float | % | 0.0 to 100.0 (or empty/null) | Sensor or manual reading | Most recent volumetric soil moisture percentage at decision time. |
| `moisture_change_6h` | float | % | -50.0 to 50.0 (or empty/null) | Derived (Sensor readings) | Change in moisture percentage over the last 6 hours (`moisture_now - moisture_6h_ago`). |
| `moisture_change_24h` | float | % | -70.0 to 70.0 (or empty/null) | Derived (Sensor readings) | Change in moisture percentage over the last 24 hours (`moisture_now - moisture_24h_ago`). |
| `reading_age_minutes` | float | minutes | 0.0 to 43,200.0 (or empty/null) | Derived (Sensor readings) | Minutes elapsed between the last moisture reading and decision time. Grows during sensor outages. |
| `moisture_source` | string | — | "sensor", "manual" (or empty/null) | Sensor or manual reading | Origin of the reading: hardware telemetry sensor or farmer manual reading entry. |
| **Weather Now** | | | | | |
| `temperature_c` | float | °C | -10.0 to 55.0 | Weather API (current) | Ambient air temperature at the field location at decision time. |
| `humidity_percent` | integer | % | 0 to 100 | Weather API (current) | Relative air humidity at the field location. |
| `wind_speed_ms` | float | m/s | 0.0 to 50.0 | Weather API (current) | Sustained wind speed in metres per second. |
| `rain_mm_last_hour` | float | mm | 0.0 to 200.0 | Weather API (current) | Rainfall volume observed in the previous 1 hour. |
| **Weather Forecast** | | | | | |
| `rain_next_24h_mm` | float | mm | 0.0 to 500.0 | Weather forecast | Cumulative precipitation expected over the next 24 hours from weather forecast. |
| `rain_chance_next_24h_pct` | integer | % | 0 to 100 | Weather forecast | Maximum probability of precipitation across forecast time-slots for the next 24 hours. |
| `temp_max_next_24h_c` | float | °C | -10.0 to 60.0 | Weather forecast | Forecasted maximum temperature over the next 24 hours. |
| **Water History** | | | | | |
| `hours_since_last_irrigation` | float | hours | 0.0 to 720.0 (or empty/null) | Derived (Irrigation log) | Hours elapsed since the most recent irrigation event ended. Null if field was never irrigated. |
| `last_irrigation_minutes` | integer | minutes | 1 to 720 (or empty/null) | Irrigation log | Duration of the most recent completed irrigation session. Null if never irrigated. |
| `irrigation_minutes_last_7d` | integer | minutes | 0 to 5000 (or empty/null) | Derived (Irrigation log) | Total cumulative minutes irrigated across the past 7 days (168 hours). Null if never irrigated. |
| **Targets** | | | | | |
| `irrigate_now` | integer | binary (0 or 1) | 0 or 1 | Target | Binary classification label: `1` if irrigation should start at this decision hour, `0` otherwise. |
| `irrigation_duration_minutes` | integer | minutes | 0 to 240 | Target | Regression label: Recommended duration to irrigate. Must be `0` when `irrigate_now == 0`. |

---

## 3. Targets and Labelling

1. **`irrigate_now` (Binary Target: 0 or 1)**
   - **Labelling:** Labelled `1` if an actual irrigation event (`irrigation_logs.started_at`) occurred within a 1-hour window following the decision timestamp; otherwise labelled `0`.
   - **Weakness:** Relies on farmer manual activity logs. Farmers might delay logging, forget to log, or irrigate on arbitrary convenience schedules rather than optimal agronomic necessity.

2. **`irrigation_duration_minutes` (Regression Target)**
   - **Labelling:** Extracted directly from `irrigation_logs.duration_minutes` for rows where `irrigate_now == 1`. When `irrigate_now == 0`, the value is strictly `0`.
   - **Weakness:** Farmers manually tap "Done" in the application to record irrigation stop times, resulting in coarse rounding (e.g. rounded to nearest 15 or 30 minutes) and human delay.

3. **Derivation of Irrigation Volume in Litres:**
   - When `pump_flow_rate_lph` is known, total water volume in litres is derived as:
     $$\text{water\_liters} = \frac{\text{irrigation\_duration\_minutes}}{60.0} \times \text{pump\_flow\_rate\_lph}$$
   - When `pump_flow_rate_lph` is null or missing, volume cannot be directly computed and duration remains the primary operational target.

---

## 4. Missing Values Handling Rules

| Column | Can Be Missing? | Condition / Cause | ML Preprocessing & Imputation Rule |
|---|---|---|---|
| `field_id`, `timestamp_utc` | No | None | Mandatory identifiers. Rows with missing identifiers are rejected. |
| `crop`, `soil_type`, `irrigation_method`, `water_source` | No | None | Required field registration attributes. Must be present. |
| `area_acres` | No | None | Always computable from `area` and `area_unit`. Must be > 0. |
| `pump_flow_rate_lph` | Yes | Farmer did not specify pump capacity | Retain as NaN; impute using median flow rate grouped by `irrigation_method` and `water_source`, or pass through models supporting missing features. |
| `days_since_sowing` | Yes | Field registered before sowing (`sowing_date` is null) | Fill with `-1` (flag value) and ensure `growth_stage` is `"Not sown yet"`. |
| `growth_stage` | No | Always calculated | Defaults to `"Not sown yet"` when sowing date is null or in the future. |
| `soil_moisture_pct` | Yes | Sensor offline, hardware battery loss, or field has no sensor | Do not drop row. Retain as NaN. Add indicator column `moisture_missing=1`. Impute via soil water-balance decay model from weather and prior readings. |
| `moisture_change_6h`, `moisture_change_24h` | Yes | Insufficient sensor history (< 6h/24h) or prolonged sensor outage | Retain as NaN; impute with 0.0 or forward-calculated moisture drift. |
| `reading_age_minutes` | Yes | Field has no sensor and no manual readings have ever been entered | Set to large sentinel value (e.g. 43200 minutes = 30 days) to signify complete absence of recent telemetry. |
| `moisture_source` | Yes | No moisture reading available | Impute with `"none"` or `"unknown"`. |
| `temperature_c`, `humidity_percent`, `wind_speed_ms`, `rain_mm_last_hour` | No | Fallback to regional weather cache | Weather API readings are mandatory. If temporary API outage occurs, fill with nearest spatial weather grid or time-interpolated historical reading. |
| `rain_next_24h_mm`, `rain_chance_next_24h_pct`, `temp_max_next_24h_c` | No | Fallback to regional forecast | Mandatory forecast features. Impute with seasonal daily averages if upstream weather forecast service fails. |
| `hours_since_last_irrigation`, `last_irrigation_minutes`, `irrigation_minutes_last_7d` | Yes | Newly registered field with no recorded irrigation logs | Set `hours_since_last_irrigation` to sentinel `720.0` (30 days); set `last_irrigation_minutes` to `0`; set `irrigation_minutes_last_7d` to `0`. |
| `irrigate_now`, `irrigation_duration_minutes` | No | Supervision targets | Training rows must have known ground truth targets. |

---

## 5. Data Quality and Integrity Rules

1. **Sampling Frequency:** Exactly one observation per field per hour. Missing hours in historical telemetry must be represented as explicit rows with missing sensor readings rather than skipped time steps.
2. **Timestamps:** Timestamps must be recorded in UTC ISO-8601 (`YYYY-MM-DDTHH:MM:SSZ`).
3. **Metric Units:** All measurements use standard metric units (°C, %, m/s, mm, L/h, acres, minutes, hours).
4. **Allowed Ranges:**
   - `soil_moisture_pct`: between 0.0% and 100.0%.
   - `temperature_c`: between -10.0°C and 55.0°C.
   - `humidity_percent`: between 0% and 100%.
   - `wind_speed_ms`: >= 0.0 m/s.
   - `rain_mm_last_hour`, `rain_next_24h_mm`: >= 0.0 mm.
   - `rain_chance_next_24h_pct`: integer between 0% and 100%.
5. **Target Consistency:**
   - If `irrigate_now == 0`, then `irrigation_duration_minutes` must equal `0`.
   - If `irrigate_now == 1`, then `irrigation_duration_minutes` must be `> 0` (typically between 10 and 180 minutes).

---

## 6. Known Gaps in Current System and Future Fixes

1. **Weather Forecasts are Ephemeral:**
   - *Current limitation:* OpenWeatherMap 5-day forecasts are fetched in memory and cached for 15 minutes, but never persisted in PostgreSQL or TimescaleDB. Historical training sets cannot reconstruct what the forecast was at a historical decision time.
   - *Future fix:* Create a `weather_forecasts` TimescaleDB hypertable storing hourly forecast snapshots (`recorded_at`, `field_id`, `forecast_for_time`, `rain_mm`, `rain_chance`, `temp_max`).
2. **Sensor Outage and Stale Telemetry:**
   - *Current limitation:* When an ESP32 hardware node goes offline or loses battery, no readings are generated; the system only notices via age calculation in memory (`sensor.py`).
   - *Future fix:* Implement explicit sensor heartbeat telemetry and automated offline notification alerts.
3. **Unrecorded Pump Capacities:**
   - *Current limitation:* `pump_flow_rate` in the `fields` table is optional and frequently null in farmer registrations.
   - *Future fix:* Provide a flow-rate calibration wizard in the mobile UI or adopt standard agronomic defaults based on pipe diameter and pump horsepower.
4. **Generic Growth Stages:**
   - *Current limitation:* `backend/growth.py` uses fixed generic thresholds (14, 45, 75 days) for all crops alike.
   - *Future fix:* Introduce crop-specific growth tables and GDD (Growing Degree Day) thermal calculations taking daily temperatures into account.
5. **Weak Recommendation-to-Action Linkage:**
   - *Current limitation:* `irrigation_logs.recommendation_id` is optional; farmers often execute irrigation without tagging recommendations or skip recommendations without recording feedback.
   - *Future fix:* Prompt the farmer in the mobile UI when marking a schedule item done to confirm whether it corresponds to the system recommendation.

---

## 7. Data Leakage Warning

To ensure valid model evaluation and prevent optimistic bias, features must strictly reflect information available at or before the decision timestamp:
- **No Future Ground Truth:** Never include sensor readings, rain measurements, or irrigation events that took place after `timestamp_utc`.
- **Forecast Exception:** Weather forecasts predicting the subsequent 24 hours are permitted *only* if the forecast was issued at or before `timestamp_utc`.
- **Time-Series Splitting:** Train, validation, and test sets must be split temporally (e.g. train on months 1–4, test on month 5) rather than randomly across rows to prevent temporal data leakage.
