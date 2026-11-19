"""ML prediction service for irrigation decisions.

Loads trained models once at module level and serves predictions for a single
field from live database data.  The 27 raw columns are built exactly as
described in DATASET.md, fed through the same feature-engineering code as
features.py (imported, not copied), imputed with the training medians in
data/imputation.json, and ordered by data/feature_columns.json.

Time-zone note
--------------
generate_data.py creates timestamps with::

    start_dt = datetime.strptime(start_date_str, "%Y-%m-%d").replace(tzinfo=timezone.utc)
    dt = start_dt + timedelta(hours=h_idx)
    hour = dt.hour          # <- UTC hour

features.py extracts the same value::

    ts = pd.to_datetime(df["timestamp_utc"], utc=True)
    df["hour_of_day"] = ts.dt.hour   # <- UTC hour

The temperature peak constant PEAK_TEMP_HOUR = 14.5 therefore refers to UTC
hour 14 (IST 20:00).  Both training and feature extraction operate on UTC
hours, so this module also uses UTC hours — no IST conversion is needed.
"""

import json
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import joblib
import numpy as np
import pandas as pd
from sqlalchemy.orm import Session

# ---------------------------------------------------------------------------
# Path setup — make backend/ and backend/ml/ importable from any context
# ---------------------------------------------------------------------------
ML_DIR = Path(__file__).resolve().parent
BACKEND_DIR = ML_DIR.parent
for _p in (str(BACKEND_DIR), str(ML_DIR)):
    if _p not in sys.path:
        sys.path.insert(0, _p)

import models  # noqa: E402
import services.sensor as sensor_service   # noqa: E402
import services.weather as weather_service  # noqa: E402
from growth import get_growth_stage         # noqa: E402
from units import area_in_acres             # noqa: E402

# Reuse the same engineering steps from features.py — do NOT copy them.
from features import (  # noqa: E402
    IRRIGATION_HISTORY_COLS,
    engineer_features,
    one_hot_encode,
)

# ---------------------------------------------------------------------------
# File paths
# ---------------------------------------------------------------------------
DATA_DIR   = ML_DIR / "data"
MODELS_DIR = ML_DIR / "models"

_CLASSIFIER_PATH  = MODELS_DIR / "best_classifier.joblib"
_REGRESSOR_PATH   = MODELS_DIR / "best_regressor.joblib"
_THRESHOLD_PATH   = MODELS_DIR / "threshold.json"
_IMPUTATION_PATH  = DATA_DIR   / "imputation.json"
_FEATURES_PATH    = DATA_DIR   / "feature_columns.json"

# Duration rounding and clipping (matches DATASET.md § 5)
_MIN_DURATION = 10
_MAX_DURATION = 180
_ROUND_STEP   = 5

# Stale reading threshold (minutes)
# In generate_data.py, simulated sensor outages span SENSOR_OUTAGE_MIN_HOURS = 6 (360 min)
# to 24 hours. Telemetry older than 6 hours is treated as stale, preventing predictions on outdated data.
MAX_READING_AGE_MINUTES = 360

# ---------------------------------------------------------------------------
# Module-level model cache (loaded once per process)
# ---------------------------------------------------------------------------
_classifier:   Any       = None
_regressor:    Any       = None
_threshold:    float     = 0.5
_imputation:   Dict      = {}
_feature_cols: List[str] = []
_load_error:   Optional[str] = None   # truthy → loading failed


def _load_models() -> Optional[str]:
    """Load all artefacts once; return an error string on failure, else None."""
    global _classifier, _regressor, _threshold
    global _imputation, _feature_cols, _load_error

    if _load_error is not None:   # already tried and failed
        return _load_error
    if _classifier is not None:   # already succeeded
        return None

    missing = [
        p for p in (
            _CLASSIFIER_PATH, _REGRESSOR_PATH, _THRESHOLD_PATH,
            _IMPUTATION_PATH, _FEATURES_PATH,
        )
        if not p.exists()
    ]
    if missing:
        _load_error = "Model files missing: " + ", ".join(p.name for p in missing)
        return _load_error

    try:
        _classifier = joblib.load(_CLASSIFIER_PATH)
        _regressor  = joblib.load(_REGRESSOR_PATH)
        with open(_THRESHOLD_PATH)  as fh: _threshold   = float(json.load(fh)["decision_threshold"])
        with open(_IMPUTATION_PATH) as fh: _imputation  = json.load(fh)
        with open(_FEATURES_PATH)   as fh: _feature_cols = json.load(fh)
    except Exception as exc:
        _load_error = f"Failed to load model files: {exc}"
        return _load_error

    return None


# ---------------------------------------------------------------------------
# Private helpers — live data extraction
# ---------------------------------------------------------------------------

def _tz_aware(dt: Optional[datetime]) -> Optional[datetime]:
    """Ensure a datetime is UTC-aware; return None if dt is None."""
    if dt is None:
        return None
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def _sensor_history(
    db: Session,
    field: models.Field,
    latest_time: datetime,
    latest_moisture: float,
) -> Tuple[Optional[float], Optional[float]]:
    """
    Return (moisture_change_6h, moisture_change_24h).

    Finds the sensor reading closest to (latest_time - 6h) and
    (latest_time - 24h) within a ±2-hour search window and computes
    the change relative to the latest moisture.  Returns None for each
    delta when no historical reading is found in the window.
    """
    latest_time = _tz_aware(latest_time)
    if latest_time is None:
        return None, None

    def _nearest(target: datetime) -> Optional[float]:
        window = timedelta(hours=2)
        rows = (
            db.query(models.SensorReading)
            .filter(
                models.SensorReading.field_id == field.id,
                models.SensorReading.time >= target - window,
                models.SensorReading.time <= target + window,
                models.SensorReading.moisture_percent.isnot(None),
            )
            .all()
        )
        if not rows:
            return None
        best = min(
            rows,
            key=lambda r: abs((_tz_aware(r.time) - target).total_seconds()),
        )
        return best.moisture_percent

    m6  = _nearest(latest_time - timedelta(hours=6))
    m24 = _nearest(latest_time - timedelta(hours=24))

    return (
        round(latest_moisture - m6,  2) if m6  is not None else None,
        round(latest_moisture - m24, 2) if m24 is not None else None,
    )


def _irrigation_history(
    db: Session, field_id: int,
) -> Tuple[Optional[float], Optional[int], Optional[int]]:
    """
    Return (hours_since_last_irrigation, last_irrigation_minutes,
            irrigation_minutes_last_7d) from irrigation_logs.irrigated_at.

    Returns (None, None, None) when the field has never been irrigated.
    """
    now_utc  = datetime.now(timezone.utc)
    cutoff7d = now_utc - timedelta(days=7)

    last = (
        db.query(models.IrrigationLog)
        .filter(
            models.IrrigationLog.field_id == field_id,
            models.IrrigationLog.irrigated_at.isnot(None),
        )
        .order_by(models.IrrigationLog.irrigated_at.desc())
        .first()
    )
    if last is None:
        return None, None, None

    irrigated_at = _tz_aware(last.irrigated_at)
    hours_since  = round((now_utc - irrigated_at).total_seconds() / 3600.0, 2)
    last_minutes = last.duration_minutes

    logs_7d = (
        db.query(models.IrrigationLog)
        .filter(
            models.IrrigationLog.field_id == field_id,
            models.IrrigationLog.irrigated_at >= cutoff7d,
            models.IrrigationLog.irrigated_at.isnot(None),
        )
        .all()
    )
    minutes_7d = int(sum(
        lg.duration_minutes for lg in logs_7d
        if lg.duration_minutes is not None
    ))

    return hours_since, last_minutes, minutes_7d


def _forecast_snapshot(
    db: Session, field_id: int,
) -> Tuple[Optional[float], Optional[float], Optional[float]]:
    """
    Return (rain_next_24h_mm, rain_chance_next_24h_pct, temp_max_next_24h_c)
    from the most recent ForecastSnapshot row for this field.

    Call this AFTER fetch_field_weather so the snapshot is fresh.
    """
    snap = (
        db.query(models.ForecastSnapshot)
        .filter(models.ForecastSnapshot.field_id == field_id)
        .order_by(models.ForecastSnapshot.fetched_at.desc())
        .first()
    )
    if snap is None:
        return None, None, None
    return snap.rain_next_24h_mm, snap.rain_chance_next_24h, snap.max_temp_next_24h


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def score_raw_row(
    raw_row: Dict[str, Any],
    initial_notes: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """
    Score a single 27-column raw row using the trained ML models.
    Needs no database access.

    Args:
        raw_row: Dictionary matching the 27 raw columns in DATASET.md.
        initial_notes: Optional pre-existing notes (e.g. from upstream telemetry).

    Returns:
        dict: Prediction results including should_irrigate, probability,
              threshold, duration_minutes, notes, etc.
    """
    err = _load_models()
    if err:
        return {"status": "error", "message": err}

    growth_stage = raw_row.get("growth_stage")
    if growth_stage == "Not sown yet":
        return {
            "status": "not_enough_data",
            "message": "Field is not sown yet; no prediction available.",
        }

    latest_moisture = raw_row.get("soil_moisture_pct")
    if latest_moisture is None or (isinstance(latest_moisture, float) and np.isnan(latest_moisture)):
        return {
            "status": "not_enough_data",
            "message": "No soil moisture reading available; cannot make a prediction.",
        }

    # 1. Feature engineering (reuse features.py pipeline)
    df = pd.DataFrame([raw_row])
    df = engineer_features(df)
    df = one_hot_encode(df)

    # Impute remaining NaN with training medians (skip irrigation history cols
    # — engineer_features already set those to sentinel constants).
    for col in _feature_cols:
        if col in IRRIGATION_HISTORY_COLS:
            continue
        if col in df.columns:
            if pd.isna(df[col].iloc[0]):
                df[col] = df[col].fillna(_imputation.get(col, 0.0))

    # Add any one-hot column that is absent (unseen category → 0)
    for col in _feature_cols:
        if col not in df.columns:
            df[col] = 0

    X = df[_feature_cols]

    # 2. Predict
    prob = float(_classifier.predict_proba(X)[0, 1])
    should_irrigate = bool(prob >= _threshold)

    duration_minutes = 0
    if should_irrigate:
        raw_dur = float(_regressor.predict(X)[0])
        rounded = int(_ROUND_STEP * round(raw_dur / _ROUND_STEP))
        duration_minutes = max(_MIN_DURATION, min(_MAX_DURATION, rounded))

    # 3. User-facing notes
    notes = list(initial_notes or [])
    age_minutes = raw_row.get("reading_age_minutes")
    if age_minutes is not None and age_minutes > 60:
        notes.append(
            f"Moisture reading is {int(age_minutes)} min old and may be stale."
        )
    if raw_row.get("moisture_change_6h") is None:
        notes.append("No 6-hour moisture history; change_6h imputed.")
    if raw_row.get("moisture_change_24h") is None:
        notes.append("No 24-hour moisture history; change_24h imputed.")
    if raw_row.get("hours_since_last_irrigation") is None:
        notes.append("No irrigation history recorded; treating field as never irrigated.")
    if raw_row.get("pump_flow_rate_lph") is None:
        notes.append("Pump flow rate not set; duration estimate may be less accurate.")
    if raw_row.get("rain_next_24h_mm") is None:
        notes.append("Forecast unavailable; heavy-rain check imputed.")

    return {
        "status":              "ok",
        "field_id":            raw_row.get("field_id"),
        "should_irrigate":     should_irrigate,
        "probability":         round(prob, 4),
        "threshold":           round(_threshold, 4),
        "duration_minutes":    duration_minutes,
        "latest_moisture_pct": latest_moisture,
        "moisture_source":     raw_row.get("moisture_source"),
        "notes":               notes,
        "raw_row":             raw_row,
    }


def predict_for_field(db: Session, field_id: int) -> Dict[str, Any]:
    """
    Build the 27-column raw row from live database data, then call score_raw_row.

    Returns a dict with key "status":
      - "ok"              → prediction succeeded
      - "not_enough_data" → no moisture reading or field not sown
      - "stale_reading"   → latest moisture reading older than MAX_READING_AGE_MINUTES
      - "error"           → field not found or model files missing
    """
    # 0. Load models (once per process) ----------------------------------------
    err = _load_models()
    if err:
        return {"status": "error", "message": err}

    # 1. Fetch field ------------------------------------------------------------
    field = db.query(models.Field).filter(models.Field.id == field_id).first()
    if field is None:
        return {"status": "error", "message": f"Field {field_id} not found."}

    now_utc       = datetime.now(timezone.utc)
    timestamp_utc = now_utc.strftime("%Y-%m-%dT%H:%M:%SZ")

    # 2. Field registration columns --------------------------------------------
    try:
        area_acres = area_in_acres(field.area, field.area_unit)
    except ValueError:
        area_acres = None  # corrupted DB row; leave missing

    pump_flow = field.pump_flow_rate  # may be None

    # 3. Crop stage ------------------------------------------------------------
    days_since_sowing: Optional[int] = None
    if field.sowing_date is not None:
        days = (now_utc.date() - field.sowing_date).days
        if days >= 0:
            days_since_sowing = days

    growth_stage = get_growth_stage(field.sowing_date, field.crop)

    if growth_stage == "Not sown yet":
        return {
            "status": "not_enough_data",
            "message": "Field is not sown yet; no prediction available.",
        }

    # 4. Soil moisture ---------------------------------------------------------
    sensor_info     = sensor_service.get_field_latest_sensor_reading(db, field)
    latest_moisture = sensor_info.get("moisture_percent")
    moisture_source = sensor_info.get("source")
    measured_at     = _tz_aware(sensor_info.get("measured_at"))
    age_minutes: Optional[float] = sensor_info.get("age_minutes")

    if latest_moisture is None:
        return {
            "status": "not_enough_data",
            "message": (
                "No soil moisture reading available; cannot make a prediction."
            ),
            "sensor_status": sensor_info.get("status"),
        }

    if age_minutes is not None and age_minutes > MAX_READING_AGE_MINUTES:
        age_hours = round(age_minutes / 60.0, 1)
        return {
            "status": "stale_reading",
            "message": (
                f"Latest soil moisture reading is {age_hours} hours old "
                f"(older than {MAX_READING_AGE_MINUTES // 60} hours); cannot make an accurate prediction on stale data."
            ),
            "field_id": field_id,
            "reading_age_hours": age_hours,
            "latest_moisture_pct": latest_moisture,
            "moisture_source": moisture_source,
        }

    change_6h, change_24h = _sensor_history(
        db, field, measured_at, latest_moisture
    )

    # 5. Weather (one API call; also refreshes ForecastSnapshot in DB) ---------
    notes: List[str] = []
    current_weather: Dict = {}
    try:
        weather_data    = weather_service.fetch_field_weather(db, field)
        current_weather = weather_data.get("current") or {}
    except Exception:
        notes.append("Weather data unavailable; weather features will be imputed.")

    temperature_c     = current_weather.get("temperature_c")
    humidity_percent  = current_weather.get("humidity_percent")
    wind_speed_ms     = current_weather.get("wind_speed_ms")
    rain_mm_last_hour = current_weather.get("rain_mm_last_hour")

    # 6. Forecast (from DB snapshot saved during step 5) ----------------------
    rain_next_24h_mm, rain_chance_pct, temp_max_next_24h = _forecast_snapshot(
        db, field_id
    )

    # 7. Irrigation history ----------------------------------------------------
    hours_since_last, last_irr_minutes, irr_minutes_7d = _irrigation_history(
        db, field_id
    )

    # 8. Build the 27-column raw row (column order matches DATASET.md) ---------
    raw_row: Dict[str, Any] = {
        "field_id":                    field_id,
        "timestamp_utc":               timestamp_utc,
        "crop":                        field.crop,
        "soil_type":                   field.soil_type,
        "irrigation_method":           field.irrigation_method,
        "water_source":                field.water_source,
        "area_acres":                  area_acres,
        "pump_flow_rate_lph":          pump_flow,
        "days_since_sowing":           days_since_sowing,
        "growth_stage":                growth_stage,
        "soil_moisture_pct":           latest_moisture,
        "moisture_change_6h":          change_6h,
        "moisture_change_24h":         change_24h,
        "reading_age_minutes":         age_minutes,
        "moisture_source":             moisture_source,
        "temperature_c":               temperature_c,
        "humidity_percent":            humidity_percent,
        "wind_speed_ms":               wind_speed_ms,
        "rain_mm_last_hour":           rain_mm_last_hour,
        "rain_next_24h_mm":            rain_next_24h_mm,
        "rain_chance_next_24h_pct":    rain_chance_pct,
        "temp_max_next_24h_c":         temp_max_next_24h,
        "hours_since_last_irrigation": hours_since_last,
        "last_irrigation_minutes":     last_irr_minutes,
        "irrigation_minutes_last_7d":  irr_minutes_7d,
        "irrigate_now":                0,
        "irrigation_duration_minutes": 0,
    }

    # 9. Score raw row without DB access --------------------------------------
    return score_raw_row(raw_row, initial_notes=notes)
