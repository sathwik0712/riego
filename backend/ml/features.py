"""Feature engineering pipeline for ML irrigation prediction.

Reads synthetic_training.csv (from generate_data.py), cleans, engineers
features, splits by field (train/val/test), imputes with training medians,
and writes train.csv, val.csv, test.csv, feature_columns.json and
imputation.json to the output directory.
"""

import argparse
import hashlib
import json
import math
import os
import sys
from pathlib import Path

import numpy as np
import pandas as pd

# Add backend directory so crop_targets can be imported
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from crop_targets import get_target_range  # noqa: E402

# =========================================================================
# CONSTANTS — fixed category lists ensure the same one-hot columns every run
# =========================================================================

CROPS = [
    "Cotton", "Maize", "Mustard", "Potato", "Rice", "Sugarcane", "Tomato", "Wheat",
]
SOIL_TYPES = ["Clay", "Loamy", "Sandy"]
IRRIGATION_METHODS = ["Drip", "Flood", "Sprinkler"]
WATER_SOURCES = ["Borewell", "Canal", "Rain-fed", "Tank"]
GROWTH_STAGES = ["Flowering", "Germination", "Maturity", "Vegetative"]  # "Not sown yet" dropped before encoding

# Column groups for the missing-value indicator flags
MOISTURE_COLS = ["soil_moisture_pct", "moisture_change_6h", "moisture_change_24h", "reading_age_minutes"]
WEATHER_COLS  = ["temperature_c", "humidity_percent", "wind_speed_ms", "rain_mm_last_hour"]
FORECAST_COLS = ["rain_next_24h_mm", "rain_chance_next_24h_pct", "temp_max_next_24h_c"]

# Split ratios (by field count)
TRAIN_RATIO = 0.70
VAL_RATIO   = 0.15
# TEST_RATIO  = 1 - TRAIN_RATIO - VAL_RATIO = 0.15

# Fixed constants for "never irrigated" fields
NEVER_IRRIGATED_HOURS = 999.0
NEVER_IRRIGATED_LAST_MINUTES = 0.0
NEVER_IRRIGATED_7D_MINUTES = 0.0

IRRIGATION_HISTORY_COLS = [
    "hours_since_last_irrigation",
    "last_irrigation_minutes",
    "irrigation_minutes_last_7d",
]

# Identifier and target columns — not part of the feature set
ID_COLS     = ["field_id", "timestamp_utc"]
TARGET_COLS = ["irrigate_now", "irrigation_duration_minutes"]

# =========================================================================
# STEP 1: LOAD & CLEAN
# =========================================================================

def load_and_clean(path: str) -> pd.DataFrame:
    df = pd.read_csv(path)

    # Drop rows where the crop is not yet sown — no agronomic signal
    df = df[df["growth_stage"] != "Not sown yet"].copy()
    df.reset_index(drop=True, inplace=True)

    return df


# =========================================================================
# STEP 2: FEATURE ENGINEERING (uses only information known at that hour)
# =========================================================================

def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()

    # Parse timestamp
    ts = pd.to_datetime(df["timestamp_utc"], utc=True)
    df["hour_of_day"] = ts.dt.hour.astype(float)
    df["month"]       = ts.dt.month.astype(float)

    # Cyclical encoding of hour (captures 23→0 wrap-around)
    df["hour_sin"] = np.sin(2.0 * math.pi * df["hour_of_day"] / 24.0)
    df["hour_cos"] = np.cos(2.0 * math.pi * df["hour_of_day"] / 24.0)

    # Missingness indicator flags (1 = at least one of the group is missing)
    df["moisture_missing"] = df[MOISTURE_COLS].isna().any(axis=1).astype(int)
    df["weather_missing"]  = df[WEATHER_COLS].isna().any(axis=1).astype(int)
    df["forecast_missing"] = df[FORECAST_COLS].isna().any(axis=1).astype(int)

    # Manual reading flag
    df["is_manual_reading"] = (df["moisture_source"] == "manual").astype(int)

    # Heavy rain forecast flag
    df["heavy_rain_forecast"] = (df["rain_next_24h_mm"] >= 5.0).astype(int)

    # Pump flow missing flag
    df["pump_flow_missing"] = df["pump_flow_rate_lph"].isna().astype(int)

    # Never irrigated flag and sentinel values (fixed constants, not medians)
    df["never_irrigated"] = df["hours_since_last_irrigation"].isna().astype(int)
    df.loc[df["never_irrigated"] == 1, "hours_since_last_irrigation"] = NEVER_IRRIGATED_HOURS
    df.loc[df["never_irrigated"] == 1, "last_irrigation_minutes"] = NEVER_IRRIGATED_LAST_MINUTES
    df.loc[df["never_irrigated"] == 1, "irrigation_minutes_last_7d"] = NEVER_IRRIGATED_7D_MINUTES

    # moisture_gap = soil_moisture_pct - stage lower limit from crop_targets
    # Computed before one-hot encoding, so crop and growth_stage columns still exist.
    # If soil_moisture_pct is missing, moisture_gap stays NaN (filled with training median later).
    df["moisture_gap"] = df.apply(
        lambda row: (
            row["soil_moisture_pct"] - get_target_range(row["crop"], row["growth_stage"])[0]
            if not pd.isna(row["soil_moisture_pct"])
            else float("nan")
        ),
        axis=1,
    )

    return df


# =========================================================================
# STEP 3: ONE-HOT ENCODING (fixed category lists → consistent columns)
# =========================================================================

def one_hot_encode(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()

    for col, categories in [
        ("crop",               CROPS),
        ("soil_type",          SOIL_TYPES),
        ("irrigation_method",  IRRIGATION_METHODS),
        ("water_source",       WATER_SOURCES),
        ("growth_stage",       GROWTH_STAGES),
    ]:
        for cat in categories:
            new_col = f"{col}_{cat.lower().replace(' ', '_').replace('(', '').replace(')', '').replace('-', '_')}"
            df[new_col] = (df[col] == cat).astype(int)

    # Drop original categorical columns (and moisture_source handled via is_manual_reading)
    drop_cols = ["crop", "soil_type", "irrigation_method", "water_source", "growth_stage", "moisture_source"]
    df.drop(columns=drop_cols, inplace=True)

    return df


# =========================================================================
# STEP 4: FIELD-LEVEL SPLIT (no field leaks between sets)
# =========================================================================

def split_by_field(df: pd.DataFrame, seed: int):
    rng = np.random.default_rng(seed)

    all_fields = sorted(df["field_id"].unique())
    n_fields   = len(all_fields)
    shuffled   = rng.permutation(all_fields)

    n_train = int(round(n_fields * TRAIN_RATIO))
    n_val   = int(round(n_fields * VAL_RATIO))
    # test gets the remainder

    train_fields = set(shuffled[:n_train])
    val_fields   = set(shuffled[n_train : n_train + n_val])
    test_fields  = set(shuffled[n_train + n_val :])

    train_df = df[df["field_id"].isin(train_fields)].copy()
    val_df   = df[df["field_id"].isin(val_fields)].copy()
    test_df  = df[df["field_id"].isin(test_fields)].copy()

    return train_df, val_df, test_df, train_fields, val_fields, test_fields


# =========================================================================
# STEP 5: IMPUTATION — training medians only; apply to all three splits
# =========================================================================

def impute(train_df: pd.DataFrame, val_df: pd.DataFrame, test_df: pd.DataFrame, feature_cols: list):
    """
    Compute medians over the training split for numeric feature columns,
    fill NaN in all three splits with those medians, and return the median dict.
    Columns in IRRIGATION_HISTORY_COLS are excluded from median fill.
    """
    medians = {}

    for col in feature_cols:
        if col in IRRIGATION_HISTORY_COLS:
            continue
        if train_df[col].dtype in [np.float64, np.float32, float, int, np.int64, np.int32]:
            med = train_df[col].median()
            if pd.isna(med):
                med = 0.0  # fallback; should not normally occur
            medians[col] = float(med)
            train_df[col] = train_df[col].fillna(med)
            val_df[col]   = val_df[col].fillna(med)
            test_df[col]  = test_df[col].fillna(med)

    return train_df, val_df, test_df, medians


# =========================================================================
# HELPER: order output columns
# =========================================================================

def ordered_output(df: pd.DataFrame, feature_cols: list) -> pd.DataFrame:
    """Return df with columns: feature_cols + field_id + timestamp_utc + targets."""
    cols = feature_cols + ID_COLS + TARGET_COLS
    return df[cols]


# =========================================================================
# HELPER: SHA-256 of a file
# =========================================================================

def file_hash(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()


# =========================================================================
# MAIN
# =========================================================================

def main():
    parser = argparse.ArgumentParser(description="Feature engineering pipeline for irrigation ML.")
    parser.add_argument("--in",       dest="input",   default="data/synthetic_training.csv",
                        help="Path to raw synthetic CSV (default: data/synthetic_training.csv)")
    parser.add_argument("--out-dir",  dest="out_dir", default="data",
                        help="Directory for output files (default: data)")
    parser.add_argument("--seed",     type=int,       default=42,
                        help="Random seed for field split (default: 42)")
    args = parser.parse_args()

    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    print(f"Loading data from: {args.input}")
    df = load_and_clean(args.input)
    print(f"After cleaning (dropped 'Not sown yet'): {len(df):,} rows, {df['field_id'].nunique()} fields")

    print("Engineering features...")
    df = engineer_features(df)

    print("One-hot encoding categorical columns...")
    df = one_hot_encode(df)

    # Determine the feature columns (everything except IDs and targets)
    exclude = set(ID_COLS + TARGET_COLS)
    feature_cols = [c for c in df.columns if c not in exclude]

    print(f"Feature columns: {len(feature_cols)}")

    print("Splitting by field...")
    train_df, val_df, test_df, train_fields, val_fields, test_fields = split_by_field(df, args.seed)

    print("Imputing missing values with training medians...")
    train_df, val_df, test_df, medians = impute(train_df, val_df, test_df, feature_cols)

    # Save outputs
    train_out = ordered_output(train_df, feature_cols)
    val_out   = ordered_output(val_df,   feature_cols)
    test_out  = ordered_output(test_df,  feature_cols)

    train_path = out_dir / "train.csv"
    val_path   = out_dir / "val.csv"
    test_path  = out_dir / "test.csv"

    train_out.to_csv(train_path, index=False)
    val_out.to_csv(val_path,     index=False)
    test_out.to_csv(test_path,   index=False)

    # Save imputation medians and feature column list
    with open(out_dir / "imputation.json", "w") as f:
        json.dump(medians, f, indent=2)

    with open(out_dir / "feature_columns.json", "w") as f:
        json.dump(feature_cols, f, indent=2)

    print(f"\nOutputs written to: {out_dir}/")
    print("  train.csv, val.csv, test.csv")
    print("  imputation.json, feature_columns.json")


if __name__ == "__main__":
    main()
